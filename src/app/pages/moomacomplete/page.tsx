'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowRight, CheckCircle2, MessageCircle, Heart, ShieldCheck, Lock } from 'lucide-react';
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
  name?: string;
  age?: number;
  lastMenstrualPeriod?: string;
  dueDate?: string;
  currentTrimester?: string;
  weekOfPregnancy?: number;
  numberOfChildren?: number;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  healthConditions?: string;
  bloodPressure?: string;
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
      content: `Halo Mooma! Selamat datang di Mooma Complete. Saya di sini untuk membantu mengumpulkan informasi lengkap tentang perjalanan kehamilanmu.

Untuk memulai, bolehkah saya tahu siapa nama Bunda dan berapa usianya saat ini?`,
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
        console.error('User not authenticated');
        alert('Silakan login terlebih dahulu');
        return;
      }

      console.log('Saving pregnancy data for user:', user.uid);
      console.log('Data to save:', pregnancyData);

      // Save to the direct pregnancyData collection (not subcollection)
      const dataToSave = {
        ...pregnancyData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        profileCompleted: true,
      };

      await setDoc(doc(db, 'pregnancyData', user.uid), dataToSave, { merge: true });

      console.log('Pregnancy data saved successfully');
      alert('Data berhasil disimpan!');

      // Redirect to homepage after successful save
      setTimeout(() => {
        router.push('/pages/homepage');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving pregnancy data:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Gagal menyimpan data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-rose-50 to-orange-50 font-sans">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-800">Mooma Complete</h1>
                <p className="text-xs text-gray-500">Asisten Kehamilan Pribadimu</p>
              </div>
            </div>
            <div className="flex gap-4 text-xs font-medium text-gray-500 hidden sm:flex">
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Aman & Terpercaya
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                Data Terenkripsi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-fade-in`}
            >
              <div
                className={`max-w-[85%] lg:max-w-2xl px-6 py-4 rounded-2xl shadow-sm transition-all ${message.role === 'user'
                  ? 'bg-rose-500 text-white rounded-br-none'
                  : 'bg-white text-gray-700 rounded-bl-none border border-rose-50'
                  }`}
              >
                <p className="text-sm lg:text-base leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <p className={`text-[10px] mt-2 text-right ${message.role === 'user' ? 'text-rose-100' : 'text-gray-400'
                  }`}>
                  {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-6 py-4 shadow-sm border border-rose-50">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span className="text-sm text-gray-500">Sedang mengetik...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Completion Status */}
      {completed && (
        <div className="px-4 lg:px-8 pb-8 animate-fade-in">
          <div className="max-w-3xl mx-auto bg-white border border-rose-100 p-6 lg:p-8 rounded-3xl shadow-xl shadow-rose-100/50">
            <div className="text-center mb-8">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Berhasil Dikumpulkan</h2>
              <p className="text-gray-500 text-sm">Silakan periksa kembali ringkasan data kesehatanmu di bawah ini.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-8 max-h-96 overflow-y-auto border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {Object.entries(pregnancyData).map(([key, value]) => {
                  if (value && !['userId', 'updatedAt', 'completedAt', 'profileCompleted'].includes(key)) {
                    return (
                      <div key={key} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <p className="text-xs font-medium text-rose-500 uppercase tracking-wider mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <button
              onClick={savePregnancyData}
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan Data...
                </>
              ) : (
                <>
                  Simpan & Lanjut
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!completed && (
        <div className="bg-white/80 backdrop-blur-md border-t border-rose-100 p-4 lg:p-6">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik jawabanmu di sini..."
                disabled={loading}
                className="w-full pl-6 pr-14 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100 transition-all text-gray-700 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 top-2 bottom-2 bg-rose-500 text-white aspect-square rounded-xl hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-md"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
            <p className="text-[10px] text-center text-gray-400 mt-3">
              Informasi ini akan membantu kami memberikan saran kesehatan yang lebih akurat
            </p>
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
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
