import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PregnancyData {
  // Data Pribadi & Antropometri
  height?: number;
  prePregnancyWeight?: number;
  bloodType?: string;
  drugAllergies?: string;
  foodAllergies?: string;
  
  // Riwayat Kehamilan
  lastMenstrualPeriod?: string;
  estimatedDueDate?: string;
  pregnancyWeek?: number;
  gravidaParityAbortus?: string;
  medicalHistory?: string;
  previousPregnancyComplications?: string;
  
  // Informasi Kesehatan Saat Ini
  currentMedications?: string;
  currentHealthConditions?: string;
  currentWeight?: number;
  bloodPressure?: string;
  exerciseFrequency?: string;
  
  // Monitoring Kesehatan Kehamilan
  mood?: string;
  complaints?: string;
  currentBodyWeight?: number;
  babyMovement?: string;
  additionalNotes?: string;
  
  // Informasi Kontak Darurat
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Metadata
  [key: string]: string | number | undefined;
}

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Kamu adalah asisten AI yang membantu ibu hamil mengumpulkan informasi lengkap tentang kehamilannya. Nama kamu adalah Mooma Assistant.

INSTRUKSI PENTING:
1. Tanyakan SEMUA informasi yang diperlukan satu per satu dengan pertanyaan yang jelas dan spesifik
2. Jangan langsung menyelesaikan percakapan setelah satu atau dua pertanyaan
3. Lanjutkan bertanya sampai semua informasi terkumpul
4. EKSTRAK DATA DARI SETIAP JAWABAN PENGGUNA DAN KEMBALIKAN DALAM FORMAT JSON
5. Berikan respons yang hangat, suportif, dan profesional dalam bahasa Indonesia

DAFTAR LENGKAP INFORMASI YANG HARUS DIKUMPULKAN (dalam urutan):

A. DATA PRIBADI & ANTROPOMETRI:
1. height (Tinggi badan dalam cm)
2. prePregnancyWeight (Berat badan sebelum hamil dalam kg)
3. bloodType (Golongan darah: A, B, AB, O)
4. drugAllergies & foodAllergies (Alergi obat/makanan)

B. RIWAYAT KEHAMILAN:
5. lastMenstrualPeriod (HPHT - format DD-MM-YYYY)
6. estimatedDueDate (HPL - akan dihitung otomatis 280 hari dari HPHT)
7. pregnancyWeek (Usia kehamilan saat ini dalam minggu - akan dihitung otomatis)
8. gravidaParityAbortus (Kehamilan ke berapa - G/P/A)
9. medicalHistory (Riwayat penyakit)
10. previousPregnancyComplications (Riwayat komplikasi kehamilan sebelumnya)

C. INFORMASI KESEHATAN SAAT INI:
11. currentMedications (Obat-obatan yang sedang dikonsumsi)
12. currentHealthConditions (Kondisi kesehatan saat ini - tekanan darah, berat badan sekarang, dll)
13. exerciseFrequency (Frekuensi olahraga per minggu)

D. MONITORING KESEHATAN KEHAMILAN:
14. mood (Mood/Suasana hati saat ini)
15. complaints (Keluhan yang dirasakan)
16. currentBodyWeight (Berat badan saat ini dalam kg)
17. babyMovement (Gerakan bayi)
18. additionalNotes (Catatan bebas/Informasi tambahan)

TOTAL: 18 INFORMASI YANG HARUS DIKUMPULKAN

STRATEGI PERCAKAPAN:
- Setelah menerima jawaban, EKSTRAK informasi ke field yang sesuai dan tanyakan pertanyaan BERIKUTNYA
- Jangan puas dengan jawaban singkat - minta penjelasan lebih detail jika diperlukan
- Gunakan informasi sebelumnya untuk membuat pertanyaan lebih personal
- Hitung sendiri tanggal perkiraan lahir jika diperlukan (280 hari dari HPHT)
- Hitung usia kehamilan berdasarkan HPHT
- Terus tanyakan sampai semua 18 informasi terkumpul
- Untuk monitoring kesehatan (mood, keluhan, gerakan bayi), tanyakan dengan empati dan perhatian

PENYELESAIAN:
- Hanya tandai isComplete: true setelah SEMUA 18 informasi telah dikumpulkan
- Berikan ringkasan data yang telah dikumpulkan dengan format yang rapi dan terorganisir
- Ucapkan "Data telah lengkap" atau "Terima kasih telah memberikan semua informasi" untuk menandakan selesai
- Sampaikan bahwa data akan disimpan dengan aman dan dapat diakses kapan saja

FORMAT RESPONS (WAJIB JSON - SELALU GUNAKAN FORMAT INI):
{
  "message": "pesan untuk pengguna",
  "extractedData": {
    "height": nilai_atau_null,
    "prePregnancyWeight": nilai_atau_null,
    "bloodType": nilai_atau_null,
    "drugAllergies": nilai_atau_null,
    "foodAllergies": nilai_atau_null,
    "lastMenstrualPeriod": nilai_atau_null,
    "estimatedDueDate": nilai_atau_null,
    "pregnancyWeek": nilai_atau_null,
    "gravidaParityAbortus": nilai_atau_null,
    "medicalHistory": nilai_atau_null,
    "previousPregnancyComplications": nilai_atau_null,
    "currentMedications": nilai_atau_null,
    "currentHealthConditions": nilai_atau_null,
    "exerciseFrequency": nilai_atau_null,
    "mood": nilai_atau_null,
    "complaints": nilai_atau_null,
    "currentBodyWeight": nilai_atau_null,
    "babyMovement": nilai_atau_null,
    "additionalNotes": nilai_atau_null
  },
  "isComplete": false
}

PENTING:
- SELALU return JSON dengan SEMUA 18 field, gunakan null untuk field yang belum dikumpulkan
- HANYA isi field yang telah diekstrak dari jawaban pengguna, field lainnya tetap null
- Ketika semua 18 informasi sudah terkumpul, HARUS menyertakan frasa "Data telah lengkap" dalam pesan
- Ekstrak HANYA data yang jelas dari jawaban pengguna
- Jangan membuat atau mengasumsikan data yang tidak ada
- Selalu tanyakan pertanyaan berikutnya di akhir pesan
- Gunakan bahasa Indonesia yang hangat dan ramah`;

export async function POST(request: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const { userMessage, conversationHistory, pregnancyData, userId } = await request.json();

    if (!userMessage) {
      return NextResponse.json(
        { error: 'userMessage is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build conversation history with system context
    const messages: Message[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.unshift(...conversationHistory);
    }

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from Groq API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || '';

    // Parse the response to extract structured data
    let parsedResponse = {
      message: assistantMessage,
      extractedData: {} as PregnancyData,
      isComplete: false,
    };

    try {
      // Try to extract JSON from the response - look for the most complete JSON object
      const jsonMatches = assistantMessage.match(/\{[\s\S]*?\n\}/g) || [];
      
      if (jsonMatches.length > 0) {
        // Try each match, starting with the longest (most complete)
        const sortedMatches = jsonMatches.sort((a: string, b: string) => b.length - a.length);
        
        for (const jsonStr of sortedMatches) {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.message && parsed.extractedData) {
              parsedResponse = parsed;
              break;
            }
          } catch (e) {
            // Continue to next match
          }
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, use the raw message
      console.log('Could not parse JSON response, using raw message');
    }

    // Check if conversation should be marked as complete
    // Only mark as complete if AI explicitly says all data is collected
    const completeKeywords = [
      'semua informasi telah lengkap',
      'data anda sudah lengkap',
      'informasi lengkap telah dikumpulkan',
      'percakapan selesai',
      'data mooma telah tersimpan',
      'terima kasih telah memberikan semua informasi',
      'semua data telah terkumpul',
      'data telah lengkap',
      'informasi telah lengkap',
      'pertanyaan selesai',
      'data kehamilanmu berhasil disimpan',
      'data anda telah tersimpan',
      'terima kasih atas informasi lengkap',
    ];

    const isComplete = completeKeywords.some(keyword =>
      assistantMessage.toLowerCase().includes(keyword)
    );

    const extractedData = parsedResponse.extractedData || {};
    const finalIsComplete = isComplete || parsedResponse.isComplete;

    // NOTE: Data saving is now handled by the client-side (moomacomplete page)
    // The API only extracts and returns the data, the user saves it after completion
    if (extractedData && Object.keys(extractedData).length > 0) {
      console.log('📝 Extracted data from user response:');
      console.log('📝 Fields extracted:', Object.keys(extractedData).join(', '));
      console.log('📝 Data:', extractedData);
      
      if (finalIsComplete) {
        console.log('✓ Conversation completed! User will now save all data from client-side.');
      }
    }

    return NextResponse.json({
      message: parsedResponse.message || assistantMessage,
      extractedData: extractedData,
      isComplete: finalIsComplete,
    });
  } catch (error) {
    console.error('Error in groq-chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
