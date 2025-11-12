'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface PregnancyInfo {
  lastCheckupDate?: string;
  currentWeek?: number;
  weight?: number;
  bloodPressure?: string;
  bloodType?: string;
  babyHeartRate?: number;
  notes?: string;
}

// Groq will handle the conversation dynamically
const INITIAL_PROMPT = 'Halo! Saya siap memberikan informasi kesehatan kehamilan saya.';

export default function MoomaInformasi() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pregnancyInfo, setPregnancyInfo] = useState<PregnancyInfo>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with first AI message
  useEffect(() => {
    const initializeChat = async () => {
      const sessionId = `session_${Date.now()}`;
      
      const initialMessage: Message = {
        id: '0',
        type: 'ai',
        content: 'Halo Mooma! 👋 Saya di sini untuk membantu mencatat informasi kesehatan kehamilan Mooma. Mari kita mulai dengan mengumpulkan data dari pemeriksaan terakhir Mooma. Ini akan membantu saya memberikan rekomendasi yang lebih baik untuk Mooma dan bayi. Siap? 💕',
        timestamp: new Date()
      };
      setMessages([initialMessage]);

      // Get first AI response
      setIsLoading(true);
      try {
        const response = await fetch('/api/groq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: INITIAL_PROMPT, sessionId })
        });

        if (!response.ok) throw new Error('Failed to get response');
        
        const data = await response.json();
        const questionMessage: Message = {
          id: '1',
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, questionMessage]);
      } catch (error) {
        console.error('Error getting initial response:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    const sessionId = `session_${Date.now()}`;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get AI response from API
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      const aiResponse = data.response;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check if conversation should end (look for completion keywords)
      if (
        aiResponse.toLowerCase().includes('sempurna') ||
        aiResponse.toLowerCase().includes('selesai') ||
        aiResponse.toLowerCase().includes('tersimpan') ||
        aiResponse.toLowerCase().includes('data mooma telah')
      ) {
        // Extract pregnancy data from conversation
        try {
          const conversationSummary = messages
            .map(m => `${m.type === 'user' ? 'User' : 'AI'}: ${m.content}`)
            .join('\n');
          
          const extractResponse = await fetch('/api/groq/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationSummary })
          });

          if (extractResponse.ok) {
            const extractData = await extractResponse.json();
            
            // Get current user and save updated data
            const currentUser = await AuthService.getCurrentUserData();
            if (currentUser) {
              await AuthService.updateUserData(currentUser.uid, {
                ...extractData.data,
                profileCompleted: true
              });
            }
          }
          
          setIsComplete(true);
          toast.success('Data kesehatan Mooma tersimpan!');
        } catch (error) {
          console.error('Error extracting data:', error);
          setIsComplete(true);
          toast.error('Data tersimpan, namun ada kesalahan saat memproses');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-pink-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-pink-500">Mooma Info</h1>
          <p className="text-xs text-gray-500">Chatbot Kesehatan Kehamilan</p>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-pink-500 text-white rounded-br-none'
                  : 'bg-pink-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-pink-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-pink-100 text-gray-800 px-4 py-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isComplete ? (
        <div className="bg-white border-t border-pink-200 px-4 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSendMessage();
                }
              }}
              placeholder="Ketik jawaban Anda..."
              className="flex-1 px-4 py-3 border border-pink-300 rounded-lg focus:outline-none focus:border-pink-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Kirim
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-t border-pink-200 px-4 py-4">
          <Link href="/pages/homepage">
            <button className="w-full bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition-all">
              Lanjut ke Halaman Utama 🏠
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
