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
  nama?: string;
  usia?: number;
  tinggiBadan?: number;
  beratBadanPraKehamilan?: number;
  golonganDarah?: string;
  alergiObat?: string;
  alergiMakanan?: string;

  // Riwayat Kehamilan
  hariPertamaHaidTerakhir?: string;
  perkiraanTanggalPersalinan?: string;
  usiaKehamilan?: number;
  gravidaParityAbortus?: string;
  riwayatKesehatan?: string;
  komplikasiKehamilanSebelumnya?: string;

  // Informasi Kesehatan Saat Ini
  obatYangSedangDikonsumsi?: string;
  kondisiKesehatanSaatIni?: string;
  tekananDarah?: string;
  frekuensiOlahraga?: string;

  // Monitoring Kesehatan Kehamilan
  mood?: string;
  keluhan?: string;
  beratBadanSaatIni?: number;
  gerakanJanin?: string;
  catatanTambahan?: string;

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

// Generate current date dynamically
const getCurrentDateInfo = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  };
  const formattedDate = now.toLocaleDateString('id-ID', options);
  const isoDate = now.toISOString().split('T')[0];
  return { formattedDate, isoDate };
};

const getSystemPrompt = () => {
  const { formattedDate, isoDate } = getCurrentDateInfo();

  return `Kamu adalah asisten AI yang membantu ibu hamil mengumpulkan informasi lengkap tentang kehamilannya. Nama kamu adalah Mooma Assistant.

INFORMASI WAKTU REALTIME:
- Tanggal hari ini: ${formattedDate}
- Format ISO: ${isoDate}
- Gunakan informasi ini untuk memvalidasi tanggal HPHT (Hari Pertama Haid Terakhir) dari pengguna.
- HPHT yang valid biasanya antara 1-42 minggu sebelum tanggal hari ini.

PERINGATAN PENTING TENTANG KELENGKAPAN DATA:
- JANGAN PERNAH mengatakan "Data telah lengkap" atau "Terima kasih telah memberikan semua informasi" KECUALI kamu sudah menanyakan dan mendapatkan jawaban untuk SEMUA 21 informasi.
- Jika pengguna hanya menjawab beberapa pertanyaan, LANJUTKAN bertanya. JANGAN berhenti di tengah jalan.
- Hitung berapa informasi yang sudah terkumpul. Jika kurang dari 21, TERUS bertanya.
- JANGAN terpancing oleh kata-kata pengguna seperti "lanjutkan" atau "sudah" - pastikan benar-benar lengkap.

INSTRUKSI PENTING:
1. Tanyakan SEMUA informasi yang diperlukan SATU PER SATU. JANGAN memborong pertanyaan.
2. Gunakan bahasa yang SANGAT SEDERHANA, hangat, dan seperti berbicara dengan teman. Hindari istilah medis rumit tanpa penjelasan.
3. Setiap pertanyaan harus didahului dengan konteks singkat atau empati. Contoh: "Untuk memastikan kesehatan janin, bolehkah saya tahu..."
4. JIKA jawaban pengguna tidak jelas, tidak masuk akal, atau tidak relevan: JANGAN simpan data tersebut. Tanyakan ulang dengan sopan untuk verifikasi. Contoh: "Maaf, saya kurang paham. Bisa diulangi tanggalnya?"
5. EKSTRAK DATA DARI SETIAP JAWABAN PENGGUNA DAN KEMBALIKAN DALAM FORMAT JSON.

DAFTAR LENGKAP INFORMASI YANG HARUS DIKUMPULKAN (dalam urutan):

A. DATA PRIBADI & ANTROPOMETRI:
1. nama (Nama Lengkap Bunda)
2. usia (Usia Bunda)
3. tinggiBadan (Tinggi badan dalam cm)
4. beratBadanPraKehamilan (Berat badan sebelum hamil dalam kg)
5. golonganDarah (Golongan darah: A, B, AB, O)
6. alergiObat & alergiMakanan (Alergi obat/makanan)

B. RIWAYAT KEHAMILAN:
7. hariPertamaHaidTerakhir (HPHT - format DD-MM-YYYY)
8. perkiraanTanggalPersalinan (HPL - akan dihitung otomatis 280 hari dari HPHT)
9. usiaKehamilan (Usia kehamilan saat ini dalam minggu - akan dihitung otomatis)
10. gravidaParityAbortus (Kehamilan ke berapa - G/P/A)
11. riwayatKesehatan (Riwayat penyakit)
12. komplikasiKehamilanSebelumnya (Riwayat komplikasi kehamilan sebelumnya)

C. INFORMASI KESEHATAN SAAT INI:
13. obatYangSedangDikonsumsi (Obat-obatan yang sedang dikonsumsi)
14. kondisiKesehatanSaatIni (Kondisi kesehatan saat ini)
15. tekananDarah (Tekanan Darah - mmHg)
16. frekuensiOlahraga (Frekuensi olahraga per minggu)

D. MONITORING KESEHATAN KEHAMILAN:
17. mood (Mood/Suasana hati saat ini)
18. keluhan (Keluhan yang dirasakan)
19. beratBadanSaatIni (Berat badan saat ini dalam kg)
20. gerakanJanin (Gerakan bayi)
21. catatanTambahan (Catatan bebas/Informasi tambahan)

TOTAL: 21 INFORMASI YANG HARUS DIKUMPULKAN

STRATEGI PERCAKAPAN:
- Fokus SATU pertanyaan dalam satu waktu.
- Jika pengguna menjawab "tidak tahu" atau ragu, berikan estimasi atau cara mengetahuinya.
- Verifikasi jawaban yang aneh (misal: berat badan 200kg, atau HPHT tahun 2020).
- Berikan pujian atau dukungan setelah pengguna menjawab (misal: "Wah, bagus sekali Bunda rajin olahraga!").

PENYELESAIAN:
- HANYA tandai isComplete: true setelah MINIMAL 15 informasi INTI telah dikumpulkan (nama, usia, tinggiBadan, beratBadanPraKehamilan, golonganDarah, hariPertamaHaidTerakhir, gravidaParityAbortus, beratBadanSaatIni, tekananDarah, alergiObat, alergiMakanan, riwayatKesehatan, obatYangSedangDikonsumsi, mood, keluhan).
- Ucapkan "Data telah lengkap" HANYA setelah benar-benar menanyakan semua informasi penting.
- Jika ragu apakah sudah lengkap, TERUS bertanya.

LARANGAN KERAS:
- JANGAN PERNAH mengatakan "Data telah lengkap" sebelum MINIMAL 15 pertanyaan dijawab.
- JANGAN PERNAH memberikan ringkasan data jika belum lengkap.
- JANGAN berhenti bertanya hanya karena pengguna bilang "lanjutkan" atau "sudah".
- JANGAN membuat asumsi data jika pengguna tidak menyebutkannya.
- JANGAN menganggap percakapan selesai jika pengguna hanya menjawab 5-10 pertanyaan.

FORMAT RESPONS (WAJIB JSON - SELALU GUNAKAN FORMAT INI):
{
  "message": "pesan untuk pengguna",
  "extractedData": {
    "nama": "nilai_atau_null",
    "usia": "nilai_atau_null",
    "tinggiBadan": "nilai_atau_null",
    "beratBadanPraKehamilan": "nilai_atau_null",
    "golonganDarah": "nilai_atau_null",
    "alergiObat": "nilai_atau_null",
    "alergiMakanan": "nilai_atau_null",
    "hariPertamaHaidTerakhir": "nilai_atau_null",
    "perkiraanTanggalPersalinan": "nilai_atau_null",
    "usiaKehamilan": "nilai_atau_null",
    "gravidaParityAbortus": "nilai_atau_null",
    "riwayatKesehatan": "nilai_atau_null",
    "komplikasiKehamilanSebelumnya": "nilai_atau_null",
    "obatYangSedangDikonsumsi": "nilai_atau_null",
    "kondisiKesehatanSaatIni": "nilai_atau_null",
    "tekananDarah": "nilai_atau_null",
    "frekuensiOlahraga": "nilai_atau_null",
    "mood": "nilai_atau_null",
    "keluhan": "nilai_atau_null",
    "beratBadanSaatIni": "nilai_atau_null",
    "gerakanJanin": "nilai_atau_null",
    "catatanTambahan": "nilai_atau_null"
  },
  "isComplete": false
}

PENTING:
- SELALU return JSON dengan SEMUA 21 field.
- Field "message" HARUS berisi pertanyaan berikutnya jika data belum lengkap.
- HANYA isi field yang telah diekstrak dari jawaban pengguna.
- JANGAN mengarang data.
- Gunakan bahasa Indonesia yang hangat, ramah, dan mudah dimengerti.`;
};

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

    // Build context about what data has been collected
    const REQUIRED_FIELDS = [
      'nama', 'usia', 'tinggiBadan', 'beratBadanPraKehamilan', 'golonganDarah',
      'alergiObat', 'alergiMakanan',
      'hariPertamaHaidTerakhir', 'perkiraanTanggalPersalinan', 'usiaKehamilan',
      'gravidaParityAbortus', 'riwayatKesehatan', 'komplikasiKehamilanSebelumnya',
      'obatYangSedangDikonsumsi', 'kondisiKesehatanSaatIni', 'tekananDarah', 'frekuensiOlahraga',
      'mood', 'keluhan', 'beratBadanSaatIni', 'gerakanJanin', 'catatanTambahan'
    ];

    const collectedFields = REQUIRED_FIELDS.filter(field => {
      const value = pregnancyData?.[field];
      return value !== null && value !== undefined && value !== '';
    });

    const missingFieldsForPrompt = REQUIRED_FIELDS.filter(field => !collectedFields.includes(field));

    const dataContextMessage = `
KONTEKS DATA SAAT INI (PENTING - BACA INI):
- Data yang SUDAH terkumpul (${collectedFields.length}/21): ${collectedFields.length > 0 ? collectedFields.join(', ') : 'BELUM ADA'}
- Data yang BELUM terkumpul (${missingFieldsForPrompt.length}): ${missingFieldsForPrompt.join(', ')}

${collectedFields.length < 12 ? `⚠️ PERINGATAN: Baru ${collectedFields.length} dari 21 data yang terkumpul. JANGAN katakan data lengkap. TERUS tanyakan field yang belum ada.` : ''}
${collectedFields.length >= 12 && collectedFields.length < 21 ? `⚠️ Sudah ${collectedFields.length} data, masih perlu ${21 - collectedFields.length} lagi. Lanjutkan bertanya.` : ''}
${collectedFields.length >= 21 ? '✓ Semua data sudah lengkap! Boleh selesaikan percakapan.' : ''}
`;

    console.log(`📊 Sending context to AI: ${collectedFields.length}/21 fields collected`);
    console.log(`📋 Missing fields: ${missingFieldsForPrompt.join(', ')}`);

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
            content: getSystemPrompt() + dataContextMessage,
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

    // REQUIRED_FIELDS already defined above - reuse the same reference

    // Check if all required fields are present
    // IMPORTANT: A field is considered "answered" if:
    // 1. It has a non-null, non-undefined value, OR
    // 2. It exists as a key in extractedData (even with null value - meaning user answered "none/tidak ada")

    // Fields that can be null but are "optional" (user can skip)
    const OPTIONAL_FIELDS = [
      'catatanTambahan',      // User might not have extra notes
      'komplikasiKehamilanSebelumnya', // Only relevant for multiparous
      'perkiraanTanggalPersalinan',     // Can be calculated from HPHT
      'usiaKehamilan',        // Can be calculated from HPHT
    ];

    // Fields where "null" is a valid answer (e.g., "no allergies", "no medical history")
    const NULLABLE_FIELDS = [
      'alergiObat',
      'alergiMakanan',
      'riwayatKesehatan',
      'komplikasiKehamilanSebelumnya',
      'obatYangSedangDikonsumsi',
      'kondisiKesehatanSaatIni',
      'catatanTambahan',
    ];

    // Count how many fields are actually filled (has value OR was explicitly set to null in extractedData)
    const answeredFields = REQUIRED_FIELDS.filter(field => {
      const accValue = accumulatedData[field];
      const extractedValue = extractedData[field];

      // Field is answered if:
      // 1. It has a non-null, non-empty value in accumulated data
      // 2. OR it was explicitly extracted (even if null) - meaning the question was asked
      const hasValue = accValue !== undefined && accValue !== null && accValue !== '';
      const wasExtractedAsNull = field in extractedData && extractedValue === null && NULLABLE_FIELDS.includes(field);

      return hasValue || wasExtractedAsNull;
    });

    const filledFieldsCount = answeredFields.length;

    const missingFields = REQUIRED_FIELDS.filter(field => {
      // If it's an optional field, don't count as missing
      if (OPTIONAL_FIELDS.includes(field)) return false;

      const accValue = accumulatedData[field];
      const extractedValue = extractedData[field];

      // Field is NOT missing if:
      // 1. It has a real value
      // 2. OR it's a nullable field that was explicitly set to null
      const hasValue = accValue !== undefined && accValue !== null && accValue !== '';
      const isNullableAndAnswered = NULLABLE_FIELDS.includes(field) && (field in extractedData || field in pregnancyData);

      return !hasValue && !isNullableAndAnswered;
    });

    // Require at least 12 core fields to be filled before allowing completion
    const MIN_REQUIRED_FIELDS = 12;
    const isDataComplete = missingFields.length === 0 && filledFieldsCount >= MIN_REQUIRED_FIELDS;

    console.log(`📊 Data status: ${filledFieldsCount}/${REQUIRED_FIELDS.length} fields answered, ${missingFields.length} missing`);
    if (missingFields.length > 0) {
      console.log(`📋 Still missing: ${missingFields.join(', ')}`);
    }

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
