// Consultation Service - AI Chat with Text-to-Speech
// Extends the ceritaMoomaService with consultation-specific functionality

export interface ConsultationMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isSpeaking?: boolean;
}

export interface ConsultationSession {
    messages: ConsultationMessage[];
    isLoading: boolean;
}

// Text-to-Speech Service using Web Speech API
class TextToSpeechService {
    private synth: SpeechSynthesis | null = null;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private onSpeakingChange: ((isSpeaking: boolean, messageId: string | null) => void) | null = null;
    private currentMessageId: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.synth = window.speechSynthesis;
        }
    }

    setOnSpeakingChange(callback: (isSpeaking: boolean, messageId: string | null) => void) {
        this.onSpeakingChange = callback;
    }

    getVoices(): SpeechSynthesisVoice[] {
        if (!this.synth) return [];
        return this.synth.getVoices();
    }

    getIndonesianVoice(): SpeechSynthesisVoice | null {
        const voices = this.getVoices();
        // Try to find Indonesian voice
        let voice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
        // Fallback to any female-sounding English voice
        if (!voice) {
            voice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha'));
        }
        // Final fallback to first available voice
        if (!voice && voices.length > 0) {
            voice = voices[0];
        }
        return voice || null;
    }

    speak(text: string, messageId: string): void {
        if (!this.synth) {
            console.warn('Speech synthesis not supported');
            return;
        }

        // Stop any current speech
        this.stop();

        // Clean text for speech (remove emojis and special chars)
        const cleanText = text
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc Symbols and Pictographs
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport and Map
            .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
            .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voice = this.getIndonesianVoice();
        if (voice) {
            utterance.voice = voice;
        }
        utterance.rate = 0.9;  // Slightly slower for clarity
        utterance.pitch = 1.1; // Slightly higher for warmth
        utterance.volume = 1;

        this.currentUtterance = utterance;
        this.currentMessageId = messageId;

        utterance.onstart = () => {
            this.onSpeakingChange?.(true, messageId);
        };

        utterance.onend = () => {
            this.currentMessageId = null;
            this.onSpeakingChange?.(false, null);
        };

        utterance.onerror = () => {
            this.currentMessageId = null;
            this.onSpeakingChange?.(false, null);
        };

        this.synth.speak(utterance);
    }

    stop(): void {
        if (this.synth) {
            this.synth.cancel();
            this.currentMessageId = null;
            this.onSpeakingChange?.(false, null);
        }
    }

    isSpeaking(): boolean {
        return this.synth?.speaking || false;
    }

    getCurrentMessageId(): string | null {
        return this.currentMessageId;
    }
}

// Chat Service for Consultation
class ConsultationChatService {
    async sendMessage(
        userMessage: string,
        conversationHistory: { role: string; content: string }[],
        userName?: string,
        pregnancyWeek?: number | null
    ): Promise<string> {
        try {
            const response = await fetch('/api/consultation-chat', {
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
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error sending consultation message:', error);
            throw error;
        }
    }
}

// Generate unique ID
export const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Singleton instances
export const ttsService = typeof window !== 'undefined' ? new TextToSpeechService() : null;
export const consultationChatService = new ConsultationChatService();

export default {
    tts: ttsService,
    chat: consultationChatService,
    generateMessageId,
};
