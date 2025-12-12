'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Send, Volume2, Loader, MessageCircle, Heart, StopCircle, BookOpen, ChevronRight } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calculatePregnancyMetrics } from '@/lib/pregnancy-calculator';
import HomepageNavbar from '@/app/components/homepage-navbar';
import toast, { Toaster } from 'react-hot-toast';
import { ConsultationMessage, generateMessageId, ttsService, consultationChatService } from '@/services/consultationService';

export default function ConsultationPage() {
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ConsultationMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [userName, setUserName] = useState<string>('Bunda');
    const [pregnancyWeek, setPregnancyWeek] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize TTS callback
    useEffect(() => {
        if (ttsService) {
            ttsService.setOnSpeakingChange((isSpeaking, messageId) => {
                setSpeakingMessageId(isSpeaking ? messageId : null);
            });
        }
    }, []);

    // Fetch user data and show welcome message
    useEffect(() => {
        const fetchUserData = async () => {
            let fetchedName = 'Bunda';
            let fetchedWeek: number | null = null;

            try {
                const user = auth.currentUser;
                if (user) {
                    // Fetch from pregnancyData collection (same as profile page)
                    const docRef = doc(db, 'pregnancyData', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        fetchedName = data.name || 'Bunda';
                        setUserName(fetchedName);

                        // Calculate pregnancy week using pregnancy-calculator (same as profile)
                        if (data.lastMenstrualPeriod) {
                            try {
                                const metrics = calculatePregnancyMetrics(data.lastMenstrualPeriod);
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

            // Add welcome message with fetched data
            const welcomeMessage: ConsultationMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: `Hai ${fetchedName}... 💕 Aku Oona, dan aku di sini untuk menemanimu. ${fetchedWeek ? `Aku tahu kamu sedang di minggu ke-${fetchedWeek} kehamilan. ` : ''}Ceritakan saja apa yang ada di hatimu, aku siap mendengarkan. Tidak perlu buru-buru, kita ngobrol santai ya... 🌸`,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            setIsReady(true);
        };

        // Wait a moment for auth to initialize, then fetch
        const timer = setTimeout(fetchUserData, 500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll to bottom
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

        try {
            // Build conversation history
            const history = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await consultationChatService.sendMessage(
                userMessage.content,
                history,
                userName,
                pregnancyWeek
            );

            const assistantMessage: ConsultationMessage = {
                id: generateMessageId(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Gagal mengirim pesan. Coba lagi ya, Bunda!');
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
            toast.error('Text-to-speech tidak didukung di browser ini');
            return;
        }

        if (speakingMessageId === message.id) {
            ttsService.stop();
        } else {
            ttsService.speak(message.content, message.id);
        }
    };

    const getExpressionImage = () => {
        if (isSending) return '/expression/think.webp';
        if (messages.length === 0) return '/expression/hi.webp';
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'assistant') {
            if (lastMessage.content.includes('💕') || lastMessage.content.includes('🌸')) {
                return '/expression/happy.webp';
            }
        }
        return '/expression/happy.webp';
    };

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF5E4' }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-12 h-12 animate-spin text-[#EE6983]" />
                    <p className="text-[#B13455] font-semibold">Memuat konsultasi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF5E4' }}>
            <Toaster position="top-center" />
            <HomepageNavbar />

            {/* Hero Section */}
            <section className="px-4 lg:px-8 py-8 lg:py-12 text-center lg:text-left relative overflow-hidden" style={{ backgroundColor: '#EE6983' }}>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36"></div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-center relative z-10">
                    <div className="text-white order-2 lg:order-1">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-4 animate-fade-in">
                            <Heart className="w-4 h-4 text-white" />
                            <span className="text-sm font-bold text-white">Dukungan Emosional</span>
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-black mb-4 leading-tight animate-fade-in-delay-1">
                            Curhat dengan <br />
                            <span className="text-yellow-100">Oona 💕</span>
                        </h1>

                        <p className="text-lg lg:text-xl font-medium mb-6 opacity-90 leading-relaxed animate-fade-in-delay-2">
                            Ceritakan perasaanmu, aku siap mendengarkan. Bersama kita bisa meredakan kecemasan dan mencegah baby blues. 🌸
                        </p>

                        <Link
                            href="/pages/ceritamooma/jurnal"
                            className="inline-flex items-center gap-2 bg-white text-[#EE6983] font-bold py-3 px-6 rounded-xl hover:bg-yellow-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 animate-fade-in-delay-2"
                        >
                            <BookOpen className="w-5 h-5" />
                            <span>Jurnal Kehamilan</span>
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="flex justify-center lg:justify-end order-1 lg:order-2 animate-fade-in-delay-2">
                        <div className="relative w-48 h-48 lg:w-64 lg:h-64 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <img
                                src={getExpressionImage()}
                                alt="Oona"
                                className="w-40 h-40 lg:w-56 lg:h-56 object-contain transition-all duration-300"
                            />
                            <div className="absolute -top-2 -right-2 bg-white p-3 rounded-2xl shadow-xl transform rotate-12">
                                <Volume2 className="w-5 h-5 text-[#EE6983]" />
                            </div>
                            <div className="absolute -bottom-2 -left-2 bg-white p-3 rounded-2xl shadow-xl transform -rotate-12">
                                <Heart className="w-5 h-5 text-[#EE6983]" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chat Section */}
            <section className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6 pb-32 lg:pb-6">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                            <div
                                className={`max-w-[85%] lg:max-w-[70%] rounded-3xl px-5 py-4 shadow-lg ${message.role === 'user'
                                    ? 'bg-[#EE6983] text-white rounded-br-lg'
                                    : 'bg-white text-gray-700 rounded-bl-lg border border-[#FFE8F0]'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#FFE8F0]">
                                        <img src="/expression/happy.webp" alt="Oona" className="w-10 h-10 rounded-full object-contain bg-[#FFF5E4]" />
                                        <span className="font-bold text-[#EE6983] text-sm">Oona</span>
                                        <button
                                            onClick={() => handleSpeak(message)}
                                            className={`ml-auto p-2 rounded-full transition-all ${speakingMessageId === message.id
                                                ? 'bg-[#EE6983] text-white animate-pulse'
                                                : 'bg-[#FFF5E4] text-[#EE6983] hover:bg-[#FFE8F0]'
                                                }`}
                                            title={speakingMessageId === message.id ? 'Hentikan' : 'Dengarkan'}
                                        >
                                            {speakingMessageId === message.id ? (
                                                <StopCircle className="w-4 h-4" />
                                            ) : (
                                                <Volume2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                                    {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isSending && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-white rounded-3xl rounded-bl-lg px-5 py-4 shadow-lg border border-[#FFE8F0]">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#FFE8F0]">
                                    <img src="/expression/think.webp" alt="Oona" className="w-8 h-8 rounded-full object-contain bg-[#FFF5E4]" />
                                    <span className="font-bold text-[#EE6983] text-sm">Oona</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-[#EE6983] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-[#EE6983] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-[#EE6983] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-gray-400 text-sm">Oona sedang mengetik...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Fixed at bottom on mobile */}
                <div className="fixed bottom-0 left-0 right-0 lg:relative bg-[#FFF5E4] lg:bg-transparent p-4 lg:p-0 border-t lg:border-0 border-[#FFE8F0]">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 bg-white rounded-2xl p-2 shadow-xl border border-[#FFE8F0]">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ketik pertanyaanmu di sini..."
                                className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 bg-transparent outline-none text-[15px]"
                                disabled={isSending}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isSending}
                                className={`p-3 rounded-xl transition-all transform ${!inputMessage.trim() || isSending
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#EE6983] text-white hover:bg-[#D64D6B] hover:scale-105 active:scale-95 shadow-lg'
                                    }`}
                            >
                                {isSending ? (
                                    <Loader className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2 lg:mt-3">
                            Klik 🔊 untuk mendengarkan respons • Oona mungkin membuat kesalahan, selalu konsultasikan dengan dokter
                        </p>
                    </div>
                </div>
            </section>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-delay-1 {
                    0% { opacity: 0; transform: translateY(10px); }
                    20% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-delay-2 {
                    0% { opacity: 0; transform: translateY(10px); }
                    40% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
                .animate-fade-in-delay-1 { animation: fade-in-delay-1 0.6s ease-out forwards; }
                .animate-fade-in-delay-2 { animation: fade-in-delay-2 0.6s ease-out forwards; }
            `}</style>
        </div>
    );
}
