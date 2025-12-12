'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus } from 'lucide-react';
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

export default function NotesTracker() {
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
    router.push('/pages/ceritamooma');
  };
  
  const handleCancel = () => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan? Perubahan tidak akan disimpan.')) {
      router.push('/pages/ceritamooma');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setNote(prev => ({ ...prev, imageUrl }));
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-[#FFF5E4]">
      {/* Header */}
      <header className="bg-[#B13455] text-white p-4 flex justify-between items-center">
        <button 
          onClick={handleCancel}
          className="p-2 text-white hover:bg-[#EE6983] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">
          {editId ? 'Edit Catatan' : 'Catatan Baru'}
        </h1>
        <button 
          className="bg-white text-[#EE6983] hover:bg-gray-100 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 transition-colors"
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
          Simpan
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-md mt-4">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[#EE6983] text-xl font-bold mb-4 bg-transparent border-b-2 border-[#EE6983] pb-2 focus:outline-none focus:border-[#EE6983] placeholder-[#EE6983] placeholder-opacity-50"
              placeholder="Judul catatan"
            />
          ) : (
            <h1 className="text-[#EE6983] text-xl font-bold mb-4">{note.title}</h1>
          )}

          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[100px] mb-4 bg-transparent focus:outline-none resize-none text-gray-700 placeholder-[#EE6983] placeholder-opacity-50"
              placeholder="Tulis ceritamu di sini..."
            />
          ) : (
            <p className="text-gray-700 mb-4 whitespace-pre-line">{note.content}</p>
          )}

          <div className="mb-4">
            {isEditing ? (
              <div className="mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#FFF5E4] text-[#B13455] px-4 py-2 rounded-lg text-sm font-medium border border-[#EE6983] hover:bg-[#FFE4E9] transition-colors"
                >
                  {note.imageUrl ? 'Ganti Gambar' : 'Tambah Gambar'}
                </button>
              </div>
            ) : null}
            
            {note.imageUrl && (
              <div className="relative rounded-xl overflow-hidden mb-4">
                <img
                  src={note.imageUrl}
                  alt="Catatan kehamilan"
                  className="w-full h-48 object-cover rounded-lg border-2 border-[#EE6983]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <div className="flex space-x-2">
              {Object.entries(emotionIcons).map(([emotion, emoji]) => (
                <button
                  key={emotion}
                  className={`p-2 rounded-full transition-colors text-2xl ${
                    selectedEmotion === emotion 
                      ? 'bg-[#FFE4E9] border-2 border-[#EE6983]' 
                      : 'bg-[#FFF5E4] hover:bg-[#FFE4E9]'
                  }`}
                  onClick={() => setSelectedEmotion(emotion as EmotionType)}
                  disabled={!isEditing}
                  aria-label={emotion}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {!isEditing && (
              <span className="text-xs text-[#EE6983] font-medium">
                Diperbarui: {formatDate(note.updatedAt)}
              </span>
            )}
          </div>

          {/* Symptom Tracker */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-[#EE6983] font-bold mb-3">Gejala yang Dirasakan</h3>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                {symptoms.map((symptom) => (
                  <label 
                    key={symptom.id}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                      symptom.checked 
                        ? 'bg-[#FFE4E9] border border-[#EE6983]' 
                        : 'bg-[#FFF5E4] hover:bg-[#FFE4E9]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={symptom.checked}
                      onChange={() => handleSymptomToggle(symptom.id)}
                      className="hidden"
                    />
                    <span className="text-xl mr-2">{symptom.emoji}</span>
                    <span className="text-sm text-[#EE6983]">{symptom.name}</span>
                  </label>
                ))}
              </div>
            ) : note.symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {symptoms
                  .filter(s => note.symptoms.includes(s.id))
                  .map(symptom => (
                    <span 
                      key={symptom.id} 
                      className="inline-flex items-center bg-[#FFE4E9] text-[#EE6983] px-3 py-1 rounded-full text-sm"
                    >
                      <span className="mr-1">{symptom.emoji}</span>
                      {symptom.name}
                    </span>
                  ))
                }
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Tidak ada gejala yang dicatat</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}