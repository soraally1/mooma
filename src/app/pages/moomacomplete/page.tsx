'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, ArrowRight, CheckCircle, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PregnancyData {
  lastMenstrualPeriod?: string;
  dueDate?: string;
  currentTrimester?: string;
  weekOfPregnancy?: number;
  numberOfChildren?: number;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  healthConditions?: string;
  exerciseFrequency?: string;
  dietaryPreferences?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  [key: string]: string | number | undefined;
}

export default function MoomaComplete() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pregnancyData, setPregnancyData] = useState<PregnancyData>({});
  const [completed, setCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initial greeting
    const initialMessage: Message = {
      id: '0',
      role: 'assistant',
      content: `Halo Mooma! 👋 Selamat datang di Mooma Complete. Saya di sini untuk membantu mengumpulkan informasi lengkap tentang perjalanan kehamilanmu.

Mari kita mulai dengan beberapa pertanyaan penting:

1. Kapan hari pertama menstruasi terakhirmu? (format: DD-MM-YYYY)`,
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
  }, []);

  const callGroqAPI = async (userMessage: string, conversationHistory: Message[]) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/groq-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage,
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          pregnancyData,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Groq API:', error);
      throw error;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await callGroqAPI(input, [...messages, userMessage]);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update pregnancy data if extracted
      if (response.extractedData) {
        setPregnancyData(prev => ({
          ...prev,
          ...response.extractedData,
        }));
      }

      // Check if conversation is complete
      if (response.isComplete) {
        setCompleted(true);
        // Don't auto-save - let user click the save button
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const savePregnancyData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.error('❌ User not authenticated');
        alert('Silakan login terlebih dahulu');
        return;
      }

      console.log('💾 Saving pregnancy data for user:', user.uid);
      console.log('📊 Data to save:', pregnancyData);

      // Save to the direct pregnancyData collection (not subcollection)
      const dataToSave = {
        ...pregnancyData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        profileCompleted: true,
      };

      await setDoc(doc(db, 'pregnancyData', user.uid), dataToSave, { merge: true });

      console.log('✅ Pregnancy data saved successfully');
      alert('✅ Data berhasil disimpan!');
      
      // Redirect to homepage after successful save
      setTimeout(() => {
        router.push('/pages/homepage');
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error saving pregnancy data:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`❌ Gagal menyimpan data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-[#FFF5E4] to-[#FFE8D6]">
      {/* Header */}
      <div className="bg-linear-to-r from-[#EE6983] via-[#E26884] to-[#B13455] text-white p-6 lg:p-8 shadow-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="w-8 h-8" />
            <h1 className="text-4xl lg:text-5xl font-bold">Mooma Complete</h1>
          </div>
          <p className="text-base opacity-95 font-light">Lengkapi informasi kehamilanmu bersama AI Assistant kami yang peduli</p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-medium">✓ Aman & Terpercaya</span>
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-medium">✓ Data Terenkripsi</span>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-fade-in`}
            >
              <div
                className={`max-w-xs lg:max-w-2xl px-5 py-4 rounded-3xl transition-all ${
                  message.role === 'user'
                    ? 'bg-linear-to-r from-[#EE6983] to-[#E26884] text-white rounded-br-none shadow-lg hover:shadow-xl'
                    : 'bg-white text-gray-800 rounded-bl-none shadow-md hover:shadow-lg border border-pink-100'
                }`}
              >
                <p className="text-sm lg:text-base leading-relaxed whitespace-pre-wrap font-medium">
                  {message.content}
                </p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white opacity-70' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white text-gray-800 rounded-3xl rounded-bl-none px-5 py-4 shadow-md border border-pink-100">
                <div className="flex items-center gap-2">
                  <Loader className="w-5 h-5 animate-spin text-[#EE6983]" />
                  <span className="text-sm text-gray-600">AI sedang mengetik...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Completion Status */}
      {completed && (
        <div className="px-4 lg:px-8 pb-6 space-y-4">
          {/* Data Summary Card */}
          <div className="max-w-4xl mx-auto bg-[#E26884] border-2 border-[#E26884] p-6 lg:p-8 rounded-3xl shadow-2xl animate-fade-in">
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-[#E26884] p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-2xl">Data Kehamilanmu Telah Dikumpulkan</p>
                <p className="text-pink-50 text-sm mt-1">Berikut adalah data yang telah dikumpulkan. Silakan periksa kembali sebelum menyimpan:</p>
              </div>
            </div>

            {/* Data Display Grid */}
            <div
                className="bg-white bg-opacity-80 backdrop-blur-sm p-5 rounded-2xl max-h-96 overflow-y-auto mb-6 border border-blue-100 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(pregnancyData).map(([key, value]) => {
                  if (value && key !== 'userId' && key !== 'updatedAt' && key !== 'completedAt' && key !== 'profileCompleted') {
                    return (
                      <div key={key} className="bg-linear-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-[#E26884] hover:border-[#D15570] hover:shadow-md transition-all">
                        <p className="text-xs font-bold text-[#E26884] uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-sm font-semibold text-gray-800 mt-2 word-break leading-relaxed">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Combined Save & Continue Button */}
            <button
              onClick={savePregnancyData}
              disabled={loading}
              className="w-full bg-white border border-[#FFE8D6] hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-[#E26884] font-bold py-4 px-8 rounded-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl text-lg"
            >
              {loading ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Menyimpan & Melanjutkan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Simpan & Lanjut ke Beranda
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!completed && (
        <div className="bg-linear-to-r from-white to-pink-50 border-t-4 border-[#EE6983] p-4 lg:p-8 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik jawaban atau pertanyaanmu..."
                disabled={loading}
                className="flex-1 px-5 py-4 rounded-2xl border-2 border-[#EE6983] focus:outline-none focus:border-[#B13455] focus:ring-2 focus:ring-[#EE6983] focus:ring-opacity-20 transition-all disabled:bg-gray-100 disabled:text-gray-500 text-gray-800 placeholder-gray-500 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-white text-white px-6 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
            <p className="text-xs text-gray-600 mt-3 text-center font-medium">Jawab dengan jujur dan lengkap untuk hasil terbaik</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
