'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Save, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type EmotionType = 'sad' | 'neutral' | 'happy' | 'loved' | 'excited';

interface Symptom {
  id: string;
  name: string;
  emoji: string;
  checked: boolean;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  emotion: EmotionType;
  symptoms: string[];
  createdAt: Date;
  updatedAt: Date;
}

const defaultSymptoms: Omit<Symptom, 'checked'>[] = [
  { id: 's1', name: 'Telat menstruasi', emoji: '⏱️' },
  { id: 's2', name: 'Payudara sensitif/membesar', emoji: '👙' },
  { id: 's3', name: 'Mudah lelah', emoji: '😴' },
  { id: 's4', name: 'Sering buang air kecil', emoji: '🚽' },
  { id: 's5', name: 'Mood swing', emoji: '🎭' },
  { id: 's6', name: 'Perut kram ringan & flek', emoji: '🤰' },
];

const emotionIcons = {
  sad: '😢',
  neutral: '😐',
  happy: '😊',
  loved: '😍',
  excited: '🤩',
};

// Mock data for the note
const defaultNote: Omit<NoteData, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  content: '',
  imageUrl: '',
  emotion: 'neutral',
  symptoms: [],
};

// Mock database
const mockNotes: Record<string, NoteData> = {
  '1': {
    id: '1',
    title: 'Hari ke 19: Bayi mulai aktif gerak',
    content: 'Hari ini si kecil terlihat sangat aktif bergerak-gerak di dalam perut. Rasanya seperti ada kupu-kupu yang beterbangan di sana. Aku senang merasakan setiap tendangannya, meski kadang membuatku sedikit tidak nyaman.',
    imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    emotion: 'happy',
    symptoms: ['s1', 's2', 's3'],
    createdAt: new Date('2025-11-27T10:00:00'),
    updatedAt: new Date('2025-11-27T10:00:00'),
  },
};

function NotesTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [note, setNote] = useState<NoteData>({
    ...defaultNote,
    id: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [isEditing, setIsEditing] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('neutral');
  const [symptoms, setSymptoms] = useState<Symptom[]>(
    defaultSymptoms.map(symptom => ({
      ...symptom,
      checked: false // Default to false, will be updated in useEffect if editing
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSymptomToggle = (symptomId: string) => {
    setSymptoms(prev =>
      prev.map(s =>
        s.id === symptomId ? { ...s, checked: !s.checked } : s
      )
    );
  };

  // Load note if in edit mode
  useEffect(() => {
    if (editId) {
      // Get all notes from localStorage
      const savedData = localStorage.getItem('pregnancy-notes');
      let savedNotes = [];

      // Handle both array and object formats
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          savedNotes = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Convert object to array
          savedNotes = Object.values(parsed);
        }
      }

      // Try to find the note by ID in localStorage or mock data
      let existingNote = savedNotes.find((note: any) => note && note.id === editId);

      // If not found in localStorage, check mock data (for development)
      if (!existingNote && mockNotes[editId]) {
        existingNote = mockNotes[editId];
      }

      if (existingNote) {
        // Convert string dates back to Date objects
        const noteWithDates = {
          ...existingNote,
          createdAt: new Date(existingNote.createdAt),
          updatedAt: new Date(existingNote.updatedAt)
        };

        setNote(noteWithDates);
        setTitle(noteWithDates.title);
        setContent(noteWithDates.content);
        setSelectedEmotion(noteWithDates.emotion as EmotionType);
        setSymptoms(
          defaultSymptoms.map(symptom => ({
            ...symptom,
            checked: noteWithDates.symptoms.includes(symptom.id)
          }))
        );
      }
    }
  }, [editId]);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Judul catatan tidak boleh kosong');
      return;
    }

    const now = new Date();
    const updatedNote: NoteData = {
      ...note,
      id: note.id || Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      emotion: selectedEmotion,
      symptoms: symptoms.filter(s => s.checked).map(s => s.id),
      createdAt: note.createdAt || now,
      updatedAt: now,
    };

    // Get existing notes from localStorage
    const savedData = localStorage.getItem('pregnancy-notes');
    let existingNotes = [];

    // Handle both array and object formats
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (Array.isArray(parsed)) {
        existingNotes = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Convert object to array
        existingNotes = Object.values(parsed);
      }
    }

    // Ensure we have an array
    if (!Array.isArray(existingNotes)) {
      existingNotes = [];
    }

    // Prepare the note for storage (convert dates to ISO strings)
    const noteToSave = {
      ...updatedNote,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString()
    };

    let updatedNotes;
    const noteIndex = existingNotes.findIndex((n: any) => n && n.id === updatedNote.id);

    if (noteIndex !== -1) {
      // Update existing note
      updatedNotes = [
        ...existingNotes.slice(0, noteIndex),
        noteToSave,
        ...existingNotes.slice(noteIndex + 1)
      ];
    } else {
      // Add new note
      updatedNotes = [...existingNotes, noteToSave];
    }

    // Save to localStorage
    localStorage.setItem('pregnancy-notes', JSON.stringify(updatedNotes));

    // Update local state
    setNote(updatedNote);

    // Show success message and redirect to main notes page
    alert('Catatan berhasil disimpan!');
    router.push('/pages/ceritamooma/jurnal');
  };

  const handleCancel = () => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan? Perubahan tidak akan disimpan.')) {
      router.push('/pages/ceritamooma/jurnal');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setNote(prev => ({ ...prev, imageUrl }));
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5E4]">
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
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#B13455] mb-1 md:mb-2">
                    {editId ? 'Edit Catatan' : 'Catatan Baru'}
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-all hover:scale-105 active:scale-95 text-sm sm:text-base font-medium"
                    aria-label="Batal"
                  >
                    Batal
                  </button>
                  <button
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#B13455] hover:bg-[#D64D6B] text-white rounded-full text-sm sm:text-base font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md"
                    onClick={handleSave}
                    aria-label="Simpan catatan"
                  >
                    <Save className="w-4 h-4" />
                    Simpan
                  </button>
                </div>
              </header>

              <main className="relative z-10 mt-4 sm:mt-6 md:mt-8">
                <div className="space-y-6 sm:space-y-8">
                  {/* Title Input */}
                  <div>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-2xl sm:text-3xl md:text-4xl font-semibold text-[#2c2c2c] bg-transparent border-none focus:outline-none placeholder-gray-400"
                      placeholder="Judul catatan..."
                    />
                  </div>

                  {/* Content Textarea */}
                  <div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] text-base sm:text-lg md:text-xl leading-relaxed sm:leading-loose md:leading-[2.5rem] text-gray-700 bg-transparent border-none focus:outline-none resize-none placeholder-gray-400"
                      placeholder="Tulis ceritamu di sini..."
                    />
                  </div>

                  {/* Image Section */}
                  <div className="mb-4 sm:mb-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {note.imageUrl ? (
                      <div className="mb-4 p-2 sm:p-3 bg-white shadow-sm inline-block max-w-xs sm:max-w-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <img
                          src={note.imageUrl}
                          alt="Foto kenangan"
                          className="w-full h-32 sm:h-40 md:h-48 object-cover filter sepia-[0.15] rounded-sm"
                        />
                        <div className="text-center text-sm text-gray-500 mt-2 italic">Foto Kenangan</div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 w-full bg-[#B13455]/10 text-[#B13455] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#B13455]/20 transition-colors"
                        >
                          Ganti Gambar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 bg-[#B13455]/10 text-[#B13455] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B13455]/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Gambar
                      </button>
                    )}
                  </div>

                  {/* Emotion Selector */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#B13455] mb-3">Bagaimana perasaanmu?</h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {Object.entries(emotionIcons).map(([emotion, emoji]) => (
                        <button
                          key={emotion}
                          className={`p-2 sm:p-3 rounded-full transition-all text-2xl sm:text-3xl ${selectedEmotion === emotion
                            ? 'bg-yellow-50 border-2 border-[#B13455] scale-110'
                            : 'bg-gray-50 hover:bg-yellow-50/50 hover:scale-105'
                            }`}
                          onClick={() => setSelectedEmotion(emotion as EmotionType)}
                          aria-label={emotion}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Symptom Tracker */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#B13455] mb-3">Gejala yang Dirasakan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {symptoms.map((symptom) => (
                        <label
                          key={symptom.id}
                          className={`flex items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${symptom.checked
                            ? 'bg-red-50 border-2 border-[#B13455]'
                            : 'bg-gray-50 hover:bg-red-50/50 border-2 border-transparent'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={symptom.checked}
                            onChange={() => handleSymptomToggle(symptom.id)}
                            className="hidden"
                          />
                          <span className="text-xl sm:text-2xl mr-2 sm:mr-3">{symptom.emoji}</span>
                          <span className="text-sm sm:text-base text-gray-700 font-medium">{symptom.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotesTracker() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesTrackerContent />
    </Suspense>
  );
}