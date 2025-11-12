'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, ArrowRight } from 'lucide-react';
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
        await savePregnancyData();
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
      const user = auth.currentUser;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      await setDoc(doc(db, 'users', user.uid, 'pregnancyData', 'current'), {
        ...pregnancyData,
        updatedAt: new Date(),
        completedAt: new Date(),
      });

      console.log('Pregnancy data saved successfully');
    } catch (error) {
      console.error('Error saving pregnancy data:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF5E4' }}>
      {/* Header */}
      <div className="bg-linear-to-r from-[#EE6983] to-[#B13455] text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold">Mooma Complete</h1>
        <p className="text-sm opacity-90 mt-1">Lengkapi informasi kehamilanmu bersama AI Assistant</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-[#EE6983] text-white rounded-br-none'
                    : 'bg-white text-gray-800 shadow-md rounded-bl-none'
                }`}
              >
                <p className="text-sm lg:text-base leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md rounded-2xl rounded-bl-none px-4 py-3">
                <Loader className="w-5 h-5 animate-spin text-[#EE6983]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Completion Status */}
      {completed && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-4 max-w-4xl mx-auto w-full rounded">
          <p className="text-green-700 font-semibold text-lg">✓ Data kehamilanmu telah berhasil disimpan!</p>
          <p className="text-green-600 text-sm mt-2 mb-4">Semua informasi telah tersimpan dengan aman di Mooma. Sekarang kamu siap untuk melanjutkan ke dashboard.</p>
          <button
            onClick={() => router.push('/pages/homepage')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
          >
            Lanjut ke Beranda
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t-2 border-[#EE6983] p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik jawaban atau pertanyaanmu..."
              disabled={loading || completed}
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-[#EE6983] focus:outline-none focus:border-[#B13455] transition-colors disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || completed}
              className="bg-[#EE6983] hover:bg-[#B13455] text-white px-6 py-3 rounded-2xl font-semibold transition-colors disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
