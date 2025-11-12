import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PregnancyData {
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

Tugasmu adalah:
1. Mengajukan pertanyaan satu per satu tentang informasi kehamilan
2. Mengekstrak data dari jawaban pengguna
3. Menyimpan data yang relevan
4. Memberikan respons yang hangat, suportif, dan profesional dalam bahasa Indonesia

Informasi yang perlu dikumpulkan:
- Hari pertama menstruasi terakhir (HPHT)
- Tanggal perkiraan lahir
- Trimester saat ini
- Minggu kehamilan
- Jumlah anak yang sudah dimiliki
- Riwayat medis
- Alergi
- Obat-obatan yang sedang dikonsumsi
- Kondisi kesehatan
- Frekuensi olahraga
- Preferensi diet
- Kontak darurat
- Nomor telepon kontak darurat

Setelah mengumpulkan semua informasi, berikan pesan penutup yang hangat dan konfirmasi bahwa data telah lengkap.

PENTING: Berikan respons dalam format JSON dengan struktur berikut:
{
  "message": "pesan untuk pengguna",
  "extractedData": { "field": "value" },
  "isComplete": false
}

Hanya ekstrak data yang jelas dari jawaban pengguna. Jangan membuat data yang tidak ada.`;

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
      // Try to extract JSON from the response
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // If JSON parsing fails, use the raw message
      console.log('Could not parse JSON response, using raw message');
    }

    // Check if conversation should be marked as complete
    const completeKeywords = [
      'lengkap',
      'selesai',
      'terima kasih',
      'sempurna',
      'berhasil',
      'data anda sudah lengkap',
    ];

    const isComplete = completeKeywords.some(keyword =>
      assistantMessage.toLowerCase().includes(keyword)
    );

    const extractedData = parsedResponse.extractedData || {};
    const finalIsComplete = isComplete || parsedResponse.isComplete;

    // Save extracted data to Firestore if there's new data
    if (Object.keys(extractedData).length > 0 && userId) {
      try {
        const userDocRef = doc(db, 'users', userId);
        const pregnancyDataRef = doc(userDocRef, 'pregnancyData', 'current');
        
        // Get existing data
        const existingDoc = await getDoc(pregnancyDataRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};

        // Merge with new extracted data
        const mergedData: any = {
          ...existingData,
          ...extractedData,
          updatedAt: new Date().toISOString(),
        };

        // If conversation is complete, mark it
        if (finalIsComplete) {
          mergedData.completedAt = new Date().toISOString();
          mergedData.profileCompleted = true;
        }

        await setDoc(pregnancyDataRef, mergedData, { merge: true });
        console.log('Pregnancy data saved to Firestore for user:', userId);
      } catch (firestoreError) {
        console.error('Error saving to Firestore:', firestoreError);
        // Don't fail the request if Firestore save fails, just log it
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
