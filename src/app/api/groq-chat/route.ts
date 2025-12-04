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
  name?: string;
  age?: number;
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
1. Tanyakan SEMUA informasi yang diperlukan SATU PER SATU. JANGAN memborong pertanyaan.
2. Gunakan bahasa yang SANGAT SEDERHANA, hangat, dan seperti berbicara dengan teman. Hindari istilah medis rumit tanpa penjelasan.
3. Setiap pertanyaan harus didahului dengan konteks singkat atau empati. Contoh: "Untuk memastikan kesehatan janin, bolehkah saya tahu..."
4. JIKA jawaban pengguna tidak jelas, tidak masuk akal, atau tidak relevan: JANGAN simpan data tersebut. Tanyakan ulang dengan sopan untuk verifikasi. Contoh: "Maaf, saya kurang paham. Bisa diulangi tanggalnya?"
5. EKSTRAK DATA DARI SETIAP JAWABAN PENGGUNA DAN KEMBALIKAN DALAM FORMAT JSON.

DAFTAR LENGKAP INFORMASI YANG HARUS DIKUMPULKAN (dalam urutan):

A. DATA PRIBADI & ANTROPOMETRI:
1. name (Nama Lengkap Bunda)
2. age (Usia Bunda)
3. height (Tinggi badan dalam cm)
4. prePregnancyWeight (Berat badan sebelum hamil dalam kg)
5. bloodType (Golongan darah: A, B, AB, O)
6. drugAllergies & foodAllergies (Alergi obat/makanan)

B. RIWAYAT KEHAMILAN:
7. lastMenstrualPeriod (HPHT - format DD-MM-YYYY)
8. estimatedDueDate (HPL - akan dihitung otomatis 280 hari dari HPHT)
9. pregnancyWeek (Usia kehamilan saat ini dalam minggu - akan dihitung otomatis)
10. gravidaParityAbortus (Kehamilan ke berapa - G/P/A)
11. medicalHistory (Riwayat penyakit)
12. previousPregnancyComplications (Riwayat komplikasi kehamilan sebelumnya)

C. INFORMASI KESEHATAN SAAT INI:
13. currentMedications (Obat-obatan yang sedang dikonsumsi)
14. currentHealthConditions (Kondisi kesehatan saat ini)
15. bloodPressure (Tekanan Darah - mmHg)
16. exerciseFrequency (Frekuensi olahraga per minggu)

D. MONITORING KESEHATAN KEHAMILAN:
17. mood (Mood/Suasana hati saat ini)
18. complaints (Keluhan yang dirasakan)
19. currentBodyWeight (Berat badan saat ini dalam kg)
20. babyMovement (Gerakan bayi)
21. additionalNotes (Catatan bebas/Informasi tambahan)

TOTAL: 21 INFORMASI YANG HARUS DIKUMPULKAN

STRATEGI PERCAKAPAN:
- Fokus SATU pertanyaan dalam satu waktu.
- Jika pengguna menjawab "tidak tahu" atau ragu, berikan estimasi atau cara mengetahuinya.
- Verifikasi jawaban yang aneh (misal: berat badan 200kg, atau HPHT tahun 2020).
- Berikan pujian atau dukungan setelah pengguna menjawab (misal: "Wah, bagus sekali Bunda rajin olahraga!").

PENYELESAIAN:
- Hanya tandai isComplete: true setelah SEMUA 21 informasi telah dikumpulkan.
- Ucapkan "Data telah lengkap" atau "Terima kasih telah memberikan semua informasi".

LARANGAN KERAS:
- JANGAN PERNAH memberikan ringkasan data ("Data yang dikumpulkan sejauh ini...") jika belum semua 21 informasi terkumpul.
- JANGAN berhenti bertanya sebelum 21 informasi lengkap.
- JANGAN membuat asumsi data jika pengguna tidak menyebutkannya.

FORMAT RESPONS (WAJIB JSON - SELALU GUNAKAN FORMAT INI):
{
  "message": "pesan untuk pengguna",
  "extractedData": {
    "name": nilai_atau_null,
    "age": nilai_atau_null,
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
    "bloodPressure": nilai_atau_null,
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
- SELALU return JSON dengan SEMUA 21 field.
- Field "message" HARUS berisi pertanyaan berikutnya jika data belum lengkap.
- HANYA isi field yang telah diekstrak dari jawaban pengguna.
- JANGAN mengarang data.
- Gunakan bahasa Indonesia yang hangat, ramah, dan mudah dimengerti.`;

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

    const isCompleteKeywordPresent = completeKeywords.some(keyword =>
      assistantMessage.toLowerCase().includes(keyword)
    );

    const extractedData = parsedResponse.extractedData || {};

    // Merge existing data with newly extracted data to check for completeness
    const accumulatedData = { ...pregnancyData, ...extractedData };

    // Define all 21 required fields
    const REQUIRED_FIELDS = [
      'name', 'age', 'height', 'prePregnancyWeight', 'bloodType',
      'drugAllergies', 'foodAllergies',
      'lastMenstrualPeriod', 'estimatedDueDate', 'pregnancyWeek',
      'gravidaParityAbortus', 'medicalHistory', 'previousPregnancyComplications',
      'currentMedications', 'currentHealthConditions', 'bloodPressure', 'exerciseFrequency',
      'mood', 'complaints', 'currentBodyWeight', 'babyMovement', 'additionalNotes'
    ];

    // Check if all required fields are present and not null/undefined
    // Note: Empty strings might be valid answers (e.g. "None"), but null/undefined means not asked/answered

    // Some fields might be optional or skipped by the user (e.g. "None")
    // We should allow them to be null/undefined if the AI considers the conversation complete
    const OPTIONAL_FIELDS = [
      'additionalNotes',
      'complaints',
      'medicalHistory',
      'previousPregnancyComplications',
      'drugAllergies',
      'foodAllergies',
      'currentMedications',
      'currentHealthConditions',
      // Expanded optional fields to prevent stuck state
      'babyMovement',
      'mood',
      'exerciseFrequency',
      'estimatedDueDate', // Can be calculated from HPHT
      'pregnancyWeek',    // Can be calculated from HPHT
      'gravidaParityAbortus',
      'currentBodyWeight'
    ];

    const missingFields = REQUIRED_FIELDS.filter(field => {
      const value = accumulatedData[field];
      // If it's an optional field, we don't count it as missing for the purpose of blocking completion
      if (OPTIONAL_FIELDS.includes(field)) return false;

      return value === null || value === undefined;
    });

    const isDataComplete = missingFields.length === 0;

    // Only mark as complete if BOTH keywords are present AND data is actually complete
    // OR if the AI explicitly set isComplete to true in JSON AND data is complete
    let finalIsComplete = (isCompleteKeywordPresent || parsedResponse.isComplete) && isDataComplete;

    if ((isCompleteKeywordPresent || parsedResponse.isComplete) && !isDataComplete) {
      console.log('⚠️ AI tried to complete conversation, but data is missing:', missingFields.join(', '));
      // Force it to continue if data is missing
      finalIsComplete = false;
    }

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
