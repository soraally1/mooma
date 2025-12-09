import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    orderBy,
    limit,
    Timestamp,
    getDoc
} from 'firebase/firestore';

// ==================== TYPES ====================

export type EmotionType = 'sad' | 'neutral' | 'happy' | 'loved' | 'excited';

export interface JournalNote {
    id?: string;
    userId: string;
    title: string;
    content: string;
    imageUrl?: string;
    emotion: EmotionType;
    symptoms: string[];
    createdAt: any;
    updatedAt: any;
}

export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: any;
}

export interface ChatConversation {
    id?: string;
    userId: string;
    messages: ChatMessage[];
    createdAt: any;
    updatedAt: any;
}

export interface Symptom {
    id: string;
    name: string;
    emoji: string;
}

// ==================== CONSTANTS ====================

export const DEFAULT_SYMPTOMS: Symptom[] = [
    { id: 's1', name: 'Telat menstruasi', emoji: '⏱️' },
    { id: 's2', name: 'Payudara sensitif/membesar', emoji: '👙' },
    { id: 's3', name: 'Mudah lelah', emoji: '😴' },
    { id: 's4', name: 'Sering buang air kecil', emoji: '🚽' },
    { id: 's5', name: 'Mood swing', emoji: '🎭' },
    { id: 's6', name: 'Perut kram ringan & flek', emoji: '🤰' },
    { id: 's7', name: 'Mual/Morning sickness', emoji: '🤢' },
    { id: 's8', name: 'Sakit kepala', emoji: '🤕' },
    { id: 's9', name: 'Pusing', emoji: '😵' },
    { id: 's10', name: 'Nafsu makan berubah', emoji: '🍽️' },
];

export const EMOTION_ICONS: Record<EmotionType, string> = {
    sad: '😢',
    neutral: '😐',
    happy: '😊',
    loved: '😍',
    excited: '🤩',
};

// ==================== JOURNAL SERVICE ====================

export const journalService = {
    /**
     * Get all journal notes for a user
     */
    async getNotes(userId: string): Promise<JournalNote[]> {
        try {
            const q = query(
                collection(db, 'journalNotes'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const notes: JournalNote[] = [];
            querySnapshot.forEach((doc) => {
                notes.push({ id: doc.id, ...doc.data() } as JournalNote);
            });
            return notes;
        } catch (error) {
            console.error('Error fetching journal notes:', error);
            throw error;
        }
    },

    /**
     * Get notes for a specific date
     */
    async getNotesByDate(userId: string, date: Date): Promise<JournalNote[]> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const q = query(
                collection(db, 'journalNotes'),
                where('userId', '==', userId),
                where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
                where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const notes: JournalNote[] = [];
            querySnapshot.forEach((doc) => {
                notes.push({ id: doc.id, ...doc.data() } as JournalNote);
            });
            return notes;
        } catch (error) {
            console.error('Error fetching notes by date:', error);
            throw error;
        }
    },

    /**
     * Get a single note by ID
     */
    async getNoteById(noteId: string): Promise<JournalNote | null> {
        try {
            const docRef = doc(db, 'journalNotes', noteId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as JournalNote;
            }
            return null;
        } catch (error) {
            console.error('Error fetching note:', error);
            throw error;
        }
    },

    /**
     * Create a new journal note
     */
    async createNote(note: Omit<JournalNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, 'journalNotes'), {
                ...note,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating journal note:', error);
            throw error;
        }
    },

    /**
     * Update an existing journal note
     */
    async updateNote(noteId: string, updates: Partial<JournalNote>): Promise<void> {
        try {
            const docRef = doc(db, 'journalNotes', noteId);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating journal note:', error);
            throw error;
        }
    },

    /**
     * Delete a journal note
     */
    async deleteNote(noteId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'journalNotes', noteId));
        } catch (error) {
            console.error('Error deleting journal note:', error);
            throw error;
        }
    },

    /**
     * Get recent notes (for profile/dashboard)
     */
    async getRecentNotes(userId: string, count: number = 5): Promise<JournalNote[]> {
        try {
            const q = query(
                collection(db, 'journalNotes'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(count)
            );
            const querySnapshot = await getDocs(q);
            const notes: JournalNote[] = [];
            querySnapshot.forEach((doc) => {
                notes.push({ id: doc.id, ...doc.data() } as JournalNote);
            });
            return notes;
        } catch (error) {
            console.error('Error fetching recent notes:', error);
            throw error;
        }
    },
};

// ==================== CHAT SERVICE ====================

export const chatService = {
    /**
     * Get today's conversation for a user (or create new if none exists)
     */
    async getTodayConversation(userId: string): Promise<ChatConversation | null> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const q = query(
                collection(db, 'oonaConversations'),
                where('userId', '==', userId),
                where('createdAt', '>=', Timestamp.fromDate(today)),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() } as ChatConversation;
            }
            return null;
        } catch (error) {
            console.error('Error fetching today conversation:', error);
            throw error;
        }
    },

    /**
     * Get all conversations for a user
     */
    async getConversations(userId: string): Promise<ChatConversation[]> {
        try {
            const q = query(
                collection(db, 'oonaConversations'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const conversations: ChatConversation[] = [];
            querySnapshot.forEach((doc) => {
                conversations.push({ id: doc.id, ...doc.data() } as ChatConversation);
            });
            return conversations;
        } catch (error) {
            console.error('Error fetching conversations:', error);
            throw error;
        }
    },

    /**
     * Create a new conversation
     */
    async createConversation(userId: string, initialMessage?: ChatMessage): Promise<string> {
        try {
            const messages = initialMessage ? [initialMessage] : [];
            const docRef = await addDoc(collection(db, 'oonaConversations'), {
                userId,
                messages,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        }
    },

    /**
     * Add a message to a conversation
     */
    async addMessage(conversationId: string, message: ChatMessage): Promise<void> {
        try {
            const docRef = doc(db, 'oonaConversations', conversationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const messages = data.messages || [];
                messages.push({
                    ...message,
                    timestamp: Timestamp.now(),
                });

                await updateDoc(docRef, {
                    messages,
                    updatedAt: Timestamp.now(),
                });
            }
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    },

    /**
     * Save a complete conversation (overwrite messages)
     */
    async saveConversation(conversationId: string, messages: ChatMessage[]): Promise<void> {
        try {
            const docRef = doc(db, 'oonaConversations', conversationId);
            await updateDoc(docRef, {
                messages: messages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp instanceof Date
                        ? Timestamp.fromDate(msg.timestamp)
                        : msg.timestamp,
                })),
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error saving conversation:', error);
            throw error;
        }
    },

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'oonaConversations', conversationId));
        } catch (error) {
            console.error('Error deleting conversation:', error);
            throw error;
        }
    },

    /**
     * Send message to Oona and get response
     */
    async sendToOona(
        userMessage: string,
        conversationHistory: { role: string; content: string }[],
        userName: string,
        pregnancyWeek: number | null
    ): Promise<string> {
        try {
            const response = await fetch('/api/oona-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userMessage,
                    conversationHistory,
                    userName,
                    pregnancyWeek,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from Oona');
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error sending message to Oona:', error);
            throw error;
        }
    },
};

// ==================== STATS SERVICE ====================

export const statsService = {
    /**
     * Get journal statistics for a user
     */
    async getJournalStats(userId: string): Promise<{
        totalNotes: number;
        notesThisWeek: number;
        emotionCounts: Record<EmotionType, number>;
        mostCommonSymptoms: { symptom: Symptom; count: number }[];
    }> {
        try {
            const notes = await journalService.getNotes(userId);

            // Calculate week start
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);

            const notesThisWeek = notes.filter(note => {
                const noteDate = note.createdAt?.toDate?.() || new Date(note.createdAt);
                return noteDate >= weekStart;
            }).length;

            // Count emotions
            const emotionCounts: Record<EmotionType, number> = {
                sad: 0,
                neutral: 0,
                happy: 0,
                loved: 0,
                excited: 0,
            };
            notes.forEach(note => {
                if (note.emotion && emotionCounts[note.emotion] !== undefined) {
                    emotionCounts[note.emotion]++;
                }
            });

            // Count symptoms
            const symptomCounts: Record<string, number> = {};
            notes.forEach(note => {
                note.symptoms?.forEach(symptomId => {
                    symptomCounts[symptomId] = (symptomCounts[symptomId] || 0) + 1;
                });
            });

            // Get top symptoms
            const mostCommonSymptoms = Object.entries(symptomCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([symptomId, count]) => ({
                    symptom: DEFAULT_SYMPTOMS.find(s => s.id === symptomId) || { id: symptomId, name: 'Unknown', emoji: '❓' },
                    count,
                }));

            return {
                totalNotes: notes.length,
                notesThisWeek,
                emotionCounts,
                mostCommonSymptoms,
            };
        } catch (error) {
            console.error('Error getting journal stats:', error);
            throw error;
        }
    },

    /**
     * Get chat statistics for a user
     */
    async getChatStats(userId: string): Promise<{
        totalConversations: number;
        totalMessages: number;
        conversationsThisWeek: number;
    }> {
        try {
            const conversations = await chatService.getConversations(userId);

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);

            const conversationsThisWeek = conversations.filter(conv => {
                const convDate = conv.createdAt?.toDate?.() || new Date(conv.createdAt);
                return convDate >= weekStart;
            }).length;

            const totalMessages = conversations.reduce((sum, conv) =>
                sum + (conv.messages?.length || 0), 0
            );

            return {
                totalConversations: conversations.length,
                totalMessages,
                conversationsThisWeek,
            };
        } catch (error) {
            console.error('Error getting chat stats:', error);
            throw error;
        }
    },
};

// ==================== EXPORT ALL ====================

export const ceritaMoomaService = {
    journal: journalService,
    chat: chatService,
    stats: statsService,
    symptoms: DEFAULT_SYMPTOMS,
    emotions: EMOTION_ICONS,
};

export default ceritaMoomaService;
