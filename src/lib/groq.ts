import Groq from 'groq-sdk';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class GroqService {
  private static conversationHistory: ChatMessage[] = [];
  private static groqClient: Groq | null = null;

  /**
   * Get or create Groq client
   */
  private static getGroqClient(): Groq {
    if (!this.groqClient) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }
      this.groqClient = new Groq({
        apiKey: apiKey,
      });
    }
    return this.groqClient;
  }

  /**
   * Initialize the conversation with system context
   */
  static initializeConversation() {
    this.conversationHistory = [
      {
        role: 'system',
        content: `Anda adalah asisten kesehatan kehamilan yang bernama Mooma. Anda membantu ibu hamil mengumpulkan informasi kesehatan kehamilan mereka dengan cara yang ramah dan suportif. 
        
Tugas Anda:
1. Mengajukan pertanyaan tentang pemeriksaan kehamilan terakhir
2. Mengumpulkan informasi: tanggal pemeriksaan, minggu kehamilan, berat badan, tekanan darah, golongan darah, detak jantung bayi, dan catatan dokter
3. Memberikan respons yang hangat dan mendukung
4. Setelah semua informasi terkumpul, konfirmasi bahwa data telah tersimpan

Gaya komunikasi:
- Gunakan bahasa Indonesia yang ramah
- Panggil pengguna sebagai "Mooma"
- Gunakan emoji yang sesuai
- Berikan pujian dan dukungan
- Jangan terlalu formal, tetapi profesional`
      }
    ];
  }

  /**
   * Send a message and get AI response
   */
  static async sendMessage(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: this.conversationHistory,
        model: 'llama-3.1-8b-instant',
        max_tokens: 500,
        temperature: 0.7,
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (error: any) {
      console.error('Groq API Error:', error);
      throw new Error(error.message || 'Gagal berkomunikasi dengan AI');
    }
  }

  /**
   * Get conversation history
   */
  static getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  static clearHistory() {
    this.conversationHistory = [];
    this.initializeConversation();
  }

  /**
   * Extract structured data from conversation
   */
  static async extractPregnancyData(conversationSummary: string): Promise<any> {
    const extractionPrompt = `Berdasarkan percakapan berikut, ekstrak informasi kesehatan kehamilan dalam format JSON:
    
Percakapan:
${conversationSummary}

Kembalikan JSON dengan struktur:
{
  "lastCheckupDate": "YYYY-MM-DD atau null",
  "currentWeek": number atau null,
  "weight": number atau null,
  "bloodPressure": "XXX/XX atau null",
  "bloodType": "A/B/AB/O atau null",
  "babyHeartRate": number atau null,
  "notes": "string atau null"
}

Hanya kembalikan JSON, tanpa penjelasan tambahan.`;

    try {
      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        model: 'llama-3.1-8b-instant',
        max_tokens: 300,
        temperature: 0.3,
      });

      const jsonString = response.choices[0]?.message?.content || '{}';
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Data extraction error:', error);
      return {};
    }
  }
}

// Initialize on module load
GroqService.initializeConversation();

export default GroqService;
