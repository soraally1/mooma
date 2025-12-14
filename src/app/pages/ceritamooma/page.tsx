'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Send, Volume2, Loader, StopCircle, BookOpen, ChevronRight } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calculatePregnancyMetrics } from '@/lib/pregnancy-calculator';
import HomepageNavbar from '@/app/components/homepage-navbar';
import toast, { Toaster } from 'react-hot-toast';
import { ConsultationMessage, generateMessageId, ttsService, consultationChatService } from '@/services/consultationService';

type Mood = 'happy' | 'sad' | null;
type Expression = 'happy' | 'sad' | 'think';

// Helper function to analyze sentiment from AI response
const analyzeMessageSentiment = (content: string): Expression => {
    const lowerContent = content.toLowerCase();

    // Keywords for different emotions
    const happyKeywords = [
        'hebat', 'bagus', 'luar biasa', 'sempurna', 'baik sekali', 'mantap', 'keren',
        'senang', 'gembira', 'bahagia', 'selamat', 'sukses', 'berhasil',
        'positive', 'optimis', 'semangat', 'ayo', 'yuk', '🌟', '💖', '✨', '🎉', '👏',
        'bangga', 'amazing', 'wonderful', 'great', 'excellent'
    ];

    const sadKeywords = [
        'sedih', 'khawatir', 'takut', 'cemas', 'stress', 'lelah', 'capek',
        'susah', 'sulit', 'berat', 'sakit', 'tidak nyaman', 'pahit',
        'mengerti', 'memahami', 'wajar', 'normal jika', 'perasaanmu',
        'di sini untukmu', 'mendukungmu', 'menemanimu', '💙', '🤗', '💕',
        'tenang', 'jangan khawatir', 'tidak apa-apa', 'akan baik-baik saja'
    ];

    // Count keyword matches
    let happyScore = 0;
    let sadScore = 0;

    happyKeywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) happyScore++;
    });

    sadKeywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) sadScore++;
    });

    // Determine expression based on scores
    if (sadScore > happyScore) {
        return 'sad';
    } else if (happyScore > sadScore) {
        return 'happy';
    } else {
        // Default to user's selected mood if no clear sentiment
        return 'think';
    }
};

export default function ConsultationPage() {
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ConsultationMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [userName, setUserName] = useState<string>('Bunda');
    const [pregnancyWeek, setPregnancyWeek] = useState<number | null>(null);
    const [selectedMood, setSelectedMood] = useState<Mood>(null);
    const [showMoodSelector, setShowMoodSelector] = useState(true);
    const [currentExpression, setCurrentExpression] = useState<Expression>('happy');
    const [messageExpressions, setMessageExpressions] = useState<Record<string, Expression>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ttsService) {
            ttsService.setOnSpeakingChange((isSpeaking, messageId) => {
                setSpeakingMessageId(isSpeaking ? messageId : null);
            });
        }
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            let fetchedName = 'Bunda';
            let fetchedWeek: number | null = null;

            try {
                const user = auth.currentUser;
                if (user) {
                    const docRef = doc(db, 'pregnancyData', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        fetchedName = data.nama || 'Bunda';
                        setUserName(fetchedName);

                        if (data.hariPertamaHaidTerakhir) {
                            try {
                                const metrics = calculatePregnancyMetrics(data.hariPertamaHaidTerakhir);
                                fetchedWeek = metrics.pregnancyWeek;
                                setPregnancyWeek(fetchedWeek);
                            } catch (e) {
                                console.error('Error calculating pregnancy metrics:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }

            setIsReady(true);
        };

        const timer = setTimeout(fetchUserData, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleMoodSelect = (mood: Mood) => {
        setSelectedMood(mood);
        setShowMoodSelector(false);

        // Set initial expression based on mood
        const initialExpression: Expression = mood === 'happy' ? 'happy' : 'sad';
        setCurrentExpression(initialExpression);

        const moodMessages = {
            happy: `Hai ${userName}! 🌟 Senang melihatmu bahagia hari ini! ${pregnancyWeek ? `Di minggu ke-${pregnancyWeek} ini, ` : ''}ceritakan hal-hal seru yang membuatmu senang! 💖`,
            sad: `Hai ${userName}... 💕 Aku di sini untukmu. ${pregnancyWeek ? `Di minggu ke-${pregnancyWeek} kehamilan, ` : ''}wajar kalau ada hari yang berat. Ceritakan saja, aku siap mendengarkan 🤗`
        };

        const welcomeMessage: ConsultationMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: moodMessages[mood!],
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);

        // Store expression for this message
        setMessageExpressions({ [welcomeMessage.id]: initialExpression });

        setTimeout(() => inputRef.current?.focus(), 300);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isSending) return;

        const userMessage: ConsultationMessage = {
            id: generateMessageId(),
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsSending(true);

        // Set thinking expression while processing
        setCurrentExpression('think');

        try {
            const history = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await consultationChatService.sendMessage(
                userMessage.content,
                history,
                userName,
                pregnancyWeek,
                selectedMood
            );

            const assistantMessage: ConsultationMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };

            // Analyze sentiment and set appropriate expression
            const detectedExpression = analyzeMessageSentiment(response);
            setCurrentExpression(detectedExpression);

            // Store this message's expression
            setMessageExpressions(prev => ({
                ...prev,
                [assistantMessage.id]: detectedExpression
            }));

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Gagal mengirim pesan. Coba lagi ya!');
            // Reset to previous expression on error
            setCurrentExpression(selectedMood === 'happy' ? 'happy' : 'sad');
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSpeak = (message: ConsultationMessage) => {
        if (!ttsService) {
            toast.error('Text-to-speech tidak didukung');
            return;
        }

        if (speakingMessageId === message.id) {
            ttsService.stop();
        } else {
            ttsService.speak(message.content, message.id);
        }
    };

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-12 h-12 animate-spin text-[#EE6983]" />
                    <p className="text-[#B13455] font-semibold">Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF5E4' }}>
            <Toaster position="top-center" />
            <HomepageNavbar />

            <div className="flex-1 flex flex-col">
                {showMoodSelector ? (
                    /* Mood Selection Screen */
                    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                        <div className="text-center max-w-lg mx-auto">
                            {/* Large Mascot */}
                            <div className="mb-8">
                                <img src="/oona.svg" alt="Oona" className="w-56 h-56 lg:w-72 lg:h-72 object-contain mx-auto" />
                            </div>

                            {/* Header */}
                            <h1 className="text-3xl lg:text-4xl font-black text-[#B13455] mb-3">
                                Hai, {userName}! 👋
                            </h1>
                            <p className="text-lg text-gray-600 mb-10">
                                Bagaimana perasaanmu hari ini?
                            </p>

                            {/* Mood Selection */}
                            <div className="flex justify-center gap-8 lg:gap-12 mb-12">
                                <button
                                    onClick={() => handleMoodSelect('happy')}
                                    className="flex flex-col items-center gap-4 p-6 lg:p-8 rounded-3xl bg-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 border-2 border-transparent hover:border-[#EE6983]"
                                >
                                    <img src="/expression/happy.webp" alt="Senang" className="w-28 h-28 lg:w-36 lg:h-36 object-contain" />
                                    <span className="text-xl font-bold text-[#B13455]">Senang 🌟</span>
                                </button>

                                <button
                                    onClick={() => handleMoodSelect('sad')}
                                    className="flex flex-col items-center gap-4 p-6 lg:p-8 rounded-3xl bg-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 border-2 border-transparent hover:border-[#EE6983]"
                                >
                                    <img src="/expression/sad.webp" alt="Sedih" className="w-28 h-28 lg:w-36 lg:h-36 object-contain" />
                                    <span className="text-xl font-bold text-[#B13455]">Sedih 💙</span>
                                </button>
                            </div>

                            {/* Journal Link */}
                            <Link
                                href="/pages/ceritamooma/jurnal"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-[#B13455] font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                            >
                                <BookOpen className="w-5 h-5" />
                                <span>Jurnal Kehamilan</span>
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Chat Screen */
                    <div className="flex-1 flex flex-col pb-36 lg:pb-28">
                        {/* Large Mascot at Center Top */}
                        <div className="flex flex-col items-center py-6 lg:py-8">
                            <div className="relative">
                                <img
                                    src={`/expression/${currentExpression}.webp`}
                                    alt="Oona"
                                    className={`w-44 h-44 lg:w-56 lg:h-56 object-contain transition-all duration-500 ${isSending ? 'animate-bounce-slow' : ''}`}
                                />
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                    <span className="px-4 py-1.5 rounded-full bg-[#EE6983] text-white text-sm font-bold shadow-lg">
                                        {isSending ? '💭 Mengetik...' : '💚 Online'}
                                    </span>
                                </div>
                            </div>

                            {/* Mood switcher */}
                            <button
                                onClick={() => setShowMoodSelector(true)}
                                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow hover:shadow-md transition-all text-sm text-[#B13455] font-medium"
                            >
                                <img
                                    src={selectedMood === 'happy' ? '/expression/happy.webp' : '/expression/sad.webp'}
                                    alt="mood"
                                    className="w-6 h-6 object-contain"
                                />
                                <span>Ganti mood</span>
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto px-4 lg:px-8">
                            <div className="max-w-2xl mx-auto space-y-4">
                                {messages.map((message) => (
                                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {message.role === 'assistant' && (
                                            <div className="flex-shrink-0 mr-3">
                                                <img
                                                    src={`/expression/${messageExpressions[message.id] || currentExpression}.webp`}
                                                    alt="Oona"
                                                    className="w-10 h-10 object-contain transition-opacity duration-300"
                                                />
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] ${message.role === 'user'
                                            ? 'bg-[#EE6983] text-white rounded-2xl rounded-br-md'
                                            : 'bg-white text-gray-700 rounded-2xl rounded-bl-md shadow'
                                            } px-4 py-3`}
                                        >
                                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            <div className="flex items-center justify-between mt-2 gap-3">
                                                <span className={`text-xs ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                                                    {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {message.role === 'assistant' && (
                                                    <button
                                                        onClick={() => handleSpeak(message)}
                                                        className={`p-1.5 rounded-lg transition-all ${speakingMessageId === message.id
                                                            ? 'bg-[#EE6983] text-white'
                                                            : 'text-[#EE6983] hover:bg-[#FFF5E4]'
                                                            }`}
                                                    >
                                                        {speakingMessageId === message.id ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {message.role === 'user' && (
                                            <div className="flex-shrink-0 ml-3">
                                                <div className="w-10 h-10 rounded-full bg-[#EE6983] flex items-center justify-center text-white font-bold">
                                                    {userName.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isSending && (
                                    <div className="flex justify-start">
                                        <div className="flex-shrink-0 mr-3">
                                            <img src="/expression/think.webp" alt="Oona" className="w-10 h-10 object-contain" />
                                        </div>
                                        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-[#EE6983] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-[#EE6983] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-[#EE6983] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Fixed Input at Bottom */}
                        <div className="fixed bottom-0 left-0 right-0 bg-[#FFF5E4] border-t border-[#FFE8F0] p-4 lg:p-6">
                            <div className="max-w-2xl mx-auto">
                                <div className="bg-white rounded-2xl p-2 shadow-lg border border-[#FFE8F0]">
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Ketik pesanmu ke Oona..."
                                            className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 bg-transparent outline-none text-[15px]"
                                            disabled={isSending}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!inputMessage.trim() || isSending}
                                            className={`p-3 rounded-xl transition-all ${!inputMessage.trim() || isSending
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-[#EE6983] text-white hover:bg-[#D64D6B] shadow-lg'
                                                }`}
                                        >
                                            {isSending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    🔊 Klik speaker untuk dengarkan
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow { animation: bounce-slow 1s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
