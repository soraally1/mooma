'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit, BookOpen, PenTool, Heart, Smile, Meh, Frown, Heart as HeartFilled, Sparkles } from 'lucide-react';
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


      {/* Notebook Section */}
      <div className="animate-fade-in py-6 md:py-12 px-2 sm:px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Notebook Container */}
          <div className="bg-white rounded-2xl md:rounded-[24px] shadow-md overflow-hidden relative min-h-[500px] md:min-h-[700px] transition-shadow duration-500 hover:shadow-lg">
            <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-14 md:w-16 lg:w-20 bg-gradient-to-r from-[#1a1a1a] to-[#2c2c2c] z-20 flex flex-col items-center py-4 sm:py-6 md:py-8 gap-3 sm:gap-4 md:gap-5">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-gray-600 relative hover:scale-110 transition-transform">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 bg-[#0a0a0a] rounded-full shadow-sm"></div>
                </div>
              ))}
            </div>

            {/* Page Binding Shadow */}
            <div className="absolute left-11 sm:left-13 md:left-14 lg:left-18 top-0 bottom-0 w-6 md:w-8 bg-gradient-to-r from-gray-400/30 via-gray-300/20 to-transparent z-10 pointer-events-none"></div>

            {/* Paper Content */}
            <div className="pl-16 sm:pl-18 md:pl-20 lg:pl-28 pr-4 sm:pr-6 md:pr-8 lg:pr-16 py-6 sm:py-8 md:py-12 bg-gradient-to-br from-[#fffef8] to-[#fffdf0] min-h-full relative">
              {/* Lined Paper Effect */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(transparent 0, transparent calc(2rem - 1px), #e8e8e8 calc(2rem - 1px), #e8e8e8 2rem)',
                  backgroundSize: '100% 2rem',
                  marginTop: '3rem'
                }}>
              </div>

              {/* Red Margin Line */}
              <div className="absolute left-20 sm:left-22 md:left-24 lg:left-36 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-red-300/60 to-transparent z-0"></div>

              {/* Header on Paper */}
              <header className="relative z-10 mb-6 sm:mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-4 pb-3 md:pb-4 border-b-2 border-[#B13455]/40">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#B13455] mb-1 md:mb-2">Jurnal Harian</h1>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg">
                    {currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#B13455]/5 rounded-full p-1">
                  <button onClick={() => navigateDay(-1)} className="p-2 sm:p-2.5 hover:bg-[#B13455]/15 rounded-full text-[#B13455] transition-all hover:scale-110 active:scale-95" aria-label="Hari sebelumnya">
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button onClick={() => navigateDay(1)} className="p-2 sm:p-2.5 hover:bg-[#B13455]/15 rounded-full text-[#B13455] transition-all hover:scale-110 active:scale-95" aria-label="Hari berikutnya">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </header>

              <main className="relative z-10 mt-4 sm:mt-6 md:mt-8">
                {isLoading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-[#B13455] mx-auto"></div>
                    <p className="text-gray-500 font-schoolbell mt-4 text-xl">Sedang membuka halaman...</p>
                  </div>
                ) : notes.length > 0 ? (
                  <div className="space-y-6 sm:space-y-8 md:space-y-10">
                    {notes.map((note) => (
                      <div key={note.id} className="group relative pl-5 sm:pl-6 md:pl-10 hover:pl-6 sm:hover:pl-8 md:hover:pl-12 transition-all duration-300">
                        {/* Decorative Icon */}
                        <div className="absolute left-0 top-2 sm:top-3 text-[#B13455] group-hover:scale-110 transition-all">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>

                        <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2 sm:gap-4">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#2c2c2c] group-hover:text-[#B13455] transition-colors leading-tight flex-1">
                            {note.title}
                          </h2>
                          <Link
                            href={`/pages/ceritamooma/jurnal/notes?edit=${note.id}`}
                            className="text-gray-400 hover:text-[#B13455] p-2 transform hover:rotate-12 hover:scale-110 transition-all rounded-full hover:bg-[#B13455]/5" aria-label="Edit catatan"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                        </div>

                        <div className="text-gray-500 text-sm mb-4 italic opacity-75">
                          Ditulis pukul {formatTime(note.updatedAt)}
                        </div>

                        <p className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed sm:leading-loose md:leading-[2.5rem] mb-4 sm:mb-6 whitespace-pre-line">
                          {note.content}
                        </p>

                        {note.imageUrl && (
                          <div className="mb-4 sm:mb-6 p-2 sm:p-3 bg-white shadow-sm inline-block max-w-xs sm:max-w-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <img
                              src={note.imageUrl}
                              alt="Foto kenangan"
                              className="w-full h-32 sm:h-40 md:h-48 object-cover filter sepia-[0.15] rounded-sm"
                            />
                            <div className="text-center text-sm text-gray-500 mt-2 italic">Foto Kenangan</div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 sm:gap-3 items-center mt-3 sm:mt-4">
                          {note.emotion && (
                            <div className="flex items-center gap-1.5 sm:gap-2 bg-yellow-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-yellow-200 hover:border-yellow-300 transition-all">
                              {note.emotion === 'happy' && <Smile className="w-5 h-5 text-yellow-600" />}
                              {note.emotion === 'sad' && <Frown className="w-5 h-5 text-blue-600" />}
                              {note.emotion === 'loved' && <HeartFilled className="w-5 h-5 text-pink-600" />}
                              {note.emotion === 'excited' && <Sparkles className="w-5 h-5 text-purple-600" />}
                              {note.emotion === 'neutral' && <Meh className="w-5 h-5 text-gray-600" />}
                              <span className="text-gray-700 capitalize text-xs sm:text-sm font-medium">{note.emotion}</span>
                            </div>
                          )}

                          {note.symptoms && note.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {defaultSymptoms
                                .filter(symptom => note.symptoms.includes(symptom.id))
                                .map(symptom => (
                                  <span
                                    key={symptom.id}
                                    className="inline-flex items-center bg-red-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-200 font-medium text-gray-700 text-xs sm:text-sm hover:shadow-sm transition-shadow"
                                  >
                                    <span className="mr-1.5 text-base">{symptom.emoji}</span>
                                    {symptom.name}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Separator Line */}
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#B13455]/30 to-transparent mt-6 sm:mt-8 md:mt-10 mb-4 sm:mb-6"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 sm:py-16 md:py-20">
                    <div className="mb-8">
                      <BookOpen className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto text-gray-300 mb-3 sm:mb-4" />
                      <div className="text-xl sm:text-2xl md:text-3xl text-gray-400 mb-2 font-semibold">
                        Halaman ini masih kosong
                      </div>
                      <p className="text-gray-500 text-base sm:text-lg">Mulai tulis cerita indahmu hari ini</p>
                    </div>
                    <Link
                      href="/pages/ceritamooma/jurnal/notes"
                      className="inline-flex items-center gap-2 sm:gap-3 text-white bg-[#B13455] hover:bg-[#D64D6B] font-medium text-base sm:text-lg md:text-xl px-6 sm:px-8 py-3 sm:py-4 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      <PenTool className="w-5 h-5 sm:w-6 sm:h-6" />
                      Mulai Menulis
                    </Link>
                  </div>
                )}
              </main>

              {/* Floating Action Button (Sticker Style) */}
              <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 md:bottom-10 md:right-10 z-30">
                <Link
                  href="/pages/ceritamooma/jurnal/notes"
                  className="group relative block" aria-label="Tulis catatan baru"
                >
                  <div className="absolute inset-0 bg-black/10 rounded-full blur-md transform translate-y-2 translate-x-2 group-hover:translate-y-3 group-hover:translate-x-3 transition-transform"></div>
                  <div className="relative bg-gradient-to-br from-[#B13455] to-[#D64D6B] hover:from-[#D64D6B] hover:to-[#EE6983] text-white w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all transform group-hover:scale-110 border-3 sm:border-4 border-white shadow-lg">
                    <Plus className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 group-hover:rotate-90 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
