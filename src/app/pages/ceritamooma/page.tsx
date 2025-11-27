'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NoteData {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  emotion: string;
  symptoms: string[];
  createdAt: string;
  updatedAt: string;
}

// Mock data - in a real app, you would fetch this from an API
const mockNotes: Record<string, NoteData> = {
  '2025-11-28': {
    id: '1',
    title: 'Hari ke 19: Bayi mulai aktif gerak',
    content: 'Hari ini si kecil terlihat sangat aktif bergerak-gerak di dalam perut. Rasanya seperti ada kupu-kupu yang beterbangan di sana. Aku senang merasakan setiap tendangannya, meski kadang membuatku sedikit tidak nyaman.',
    imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    emotion: 'happy',
    symptoms: ['s1', 's2', 's3'],
    createdAt: '2025-11-28T10:00:00',
    updatedAt: '2025-11-28T10:00:00',
  },
};

const defaultSymptoms = [
  { id: 's1', name: 'Telat menstruasi', emoji: '⏱️' },
  { id: 's2', name: 'Payudara sensitif/membesar', emoji: '👙' },
  { id: 's3', name: 'Mudah lelah', emoji: '😴' },
];

const emotionIcons: Record<string, string> = {
  sad: '😢',
  neutral: '😐',
  happy: '😊',
  loved: '😍',
  excited: '🤩',
};

export default function CeritaMooma() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Load notes from localStorage
      const savedData = localStorage.getItem('pregnancy-notes');
      let savedNotes = [];
      
      // Handle both old object format and new array format
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // If it's an object (old format), convert to array of notes
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          savedNotes = Object.values(parsed);
        } else if (Array.isArray(parsed)) {
          savedNotes = parsed;
        }
      }
      
      // Get notes for the current date
      const dateStr = currentDate.toISOString().split('T')[0];
      const notesForDate = savedNotes.filter((note: any) => 
        note && note.createdAt && note.createdAt.startsWith(dateStr)
      );
      
      // Sort by updatedAt (newest first)
      const sortedNotes = [...notesForDate].sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      // Convert string dates back to Date objects for the UI
      const notesWithDates = sortedNotes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
      
      setNotes(notesWithDates);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  const navigateDay = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return new Intl.DateTimeFormat('id-ID', options).format(dateObj);
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dateObj);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5E4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#EE6983]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5E4]">
      {/* Header */}
      <header className="bg-[#B13455] text-white p-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-bold">Jurnal Harian</h1>
          <Link 
            href="/pages/ceritamooma/notes"
            className="bg-white text-[#B13455] px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Baru
          </Link>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center justify-between mt-2">
          <button 
            onClick={() => navigateDay(-1)}
            className="p-1 hover:bg-[#EE6983] rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="font-medium">
              {currentDate.toLocaleDateString('id-ID', { weekday: 'long' })}
            </div>
            <div className="text-sm">
              {currentDate.toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'long',
                year: 'numeric' 
              })}
            </div>
          </div>
          
          <button 
            onClick={() => navigateDay(1)}
            className="p-1 hover:bg-[#EE6983] rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Memuat...</p>
          </div>
        ) : notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-[#B13455]">
                    {note.title}
                  </h2>
                  <Link 
                    href={`/pages/ceritamooma/notes?edit=${note.id}`}
                    className="text-[#B13455] hover:text-[#EE6983] p-1"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                </div>
                
                <div className="text-gray-500 text-sm mb-4">
                  {formatTime(note.updatedAt)}
                </div>
                
                <p className="text-gray-700 mb-4 whitespace-pre-line">
                  {note.content}
                </p>
                
                {note.imageUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={note.imageUrl}
                      alt="Catatan kehamilan"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                
                {note.emotion && (
                  <div className="flex items-center mt-4 pt-4 border-t border-gray-100">
                    <span className="text-2xl mr-2">
                      {emotionIcons[note.emotion] || '😐'}
                    </span>
                    <span className="text-sm text-gray-600 capitalize">
                      {note.emotion}
                    </span>
                  </div>
                )}
                
                {note.symptoms && note.symptoms.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-[#EE6983] font-bold mb-2">Gejala yang Dirasakan</h3>
                    <div className="flex flex-wrap gap-2">
                      {defaultSymptoms
                        .filter(symptom => note.symptoms.includes(symptom.id))
                        .map(symptom => (
                          <span
                            key={symptom.id}
                            className="inline-flex items-center bg-[#FFE4E9] text-[#EE6983] px-3 py-1 rounded-full text-sm"
                          >
                            <span className="mr-1">{symptom.emoji}</span>
                            {symptom.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Tidak ada catatan untuk hari ini</p>
            <Link
              href="/pages/ceritamooma/notes"
              className="inline-block bg-[#B13455] hover:bg-[#EE6983] text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Buat Catatan Baru
            </Link>
          </div>
        )}
        
        {/* Fixed button at bottom right */}
        <div className="fixed bottom-6 right-6">
          <Link
            href="/pages/ceritamooma/notes"
            className="bg-[#B13455] hover:bg-[#EE6983] text-white p-3 rounded-full shadow-lg flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </main>
    </div>
  );
}
