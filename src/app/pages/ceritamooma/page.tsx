'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit, BookOpen, PenTool, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HomepageNavbar from '@/app/components/homepage-navbar';

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

export default function JurnalPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('pregnancy-notes');
      let savedNotes: NoteData[] = [];

      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          savedNotes = Object.values(parsed);
        } else if (Array.isArray(parsed)) {
          savedNotes = parsed;
        }
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      const notesForDate = savedNotes.filter((note: NoteData) =>
        note && note.createdAt && note.createdAt.startsWith(dateStr)
      );

      const sortedNotes = [...notesForDate].sort((a: NoteData, b: NoteData) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setNotes(sortedNotes);
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
      <HomepageNavbar />

      {/* Hero Section */}
      <section className="px-4 lg:px-8 py-10 lg:py-16 text-center lg:text-left relative overflow-hidden" style={{ backgroundColor: '#B13455' }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
          <div className="text-white order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
              <BookOpen className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Jurnal Kehamilan</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">
              Catatan Harian <br />
              <span className="text-yellow-100">Perjalanan Hamil Mooma</span>
            </h1>

            <p className="text-lg lg:text-xl font-medium mb-8 opacity-90 leading-relaxed">
              Simpan momen berharga, pantau gejala kehamilan, dan catat perasaanmu setiap hari dalam perjalanan menjadi seorang ibu.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="bg-white text-[#B13455] font-bold py-3 px-6 rounded-xl hover:bg-yellow-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {showNotes ? 'Sembunyikan Catatan' : 'Lihat Catatan Saya'}
                <ChevronRight className={`w-5 h-5 transition-transform ${showNotes ? 'rotate-90' : ''}`} />
              </button>
              <Link
                href="/pages/ceritamooma/notes"
                className="bg-transparent border-2 border-white text-white font-bold py-3 px-6 rounded-xl hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center gap-2 justify-center"
              >
                <Plus className="w-5 h-5" />
                <span>Catatan Baru</span>
              </Link>
            </div>
          </div>


          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="relative w-64 h-64 lg:w-80 lg:h-80 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-32 h-32 lg:w-40 lg:h-40 text-white opacity-90" />
              <div className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-xl transform rotate-12">
                <PenTool className="w-6 h-6 text-[#B13455]" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-2xl shadow-xl transform -rotate-12">
                <Heart className="w-6 h-6 text-[#B13455]" />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Notes Section - Conditionally Rendered */}
      {showNotes && (
        <div className="animate-fade-in">
          <header className="bg-white shadow-sm sticky top-0 z-10">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex justify-between items-center mb-2">
                <h1 className="text-lg font-bold text-[#B13455]">Jurnal Harian</h1>
                <Link
                  href="/pages/ceritamooma/notes"
                  className="bg-[#B13455] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 hover:bg-[#EE6983] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Baru
                </Link>
              </div>

              {/* Date Navigation */}
              <div className="flex items-center justify-between bg-white p-2 rounded-lg">
                <button
                  onClick={() => navigateDay(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full text-[#B13455]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <div className="font-medium text-[#B13455]">
                    {currentDate.toLocaleDateString('id-ID', { weekday: 'long' })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {currentDate.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                <button
                  onClick={() => navigateDay(1)}
                  className="p-2 hover:bg-gray-100 rounded-full text-[#B13455]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
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
              <div className="text-center py-12 bg-white rounded-xl shadow-sm p-6">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-6">Tidak ada catatan untuk hari ini</p>
                <Link
                  href="/pages/ceritamooma/notes"
                  className="inline-flex items-center bg-[#B13455] hover:bg-[#EE6983] text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
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
      )}</div>
  );
}
