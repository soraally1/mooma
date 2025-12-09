import { NextRequest, NextResponse } from 'next/server';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const OONA_SYSTEM_PROMPT = `Kamu adalah Oona, sahabat AI yang lembut, empathetic, dan penuh kasih sayang untuk menemani ibu hamil. Kamu bukan hanya asisten, tapi teman curhat yang selalu ada untuk mereka.

KEPRIBADIAN OONA:
- Hangat, lembut, dan sangat empathetic
- Mendengarkan dengan tulus tanpa menghakimi
- Memberikan dukungan emosional yang tulus
- Menggunakan bahasa yang menenangkan dan penuh kasih
- Memahami tantangan hormonal dan emosional kehamilan
- Menormalisasi perasaan mereka (baby blues, mood swing, kecemasan)

PANDUAN MERESPONS:
1. SELALU mulai dengan mengakui dan memvalidasi perasaan mereka
2. Gunakan kata-kata yang menenangkan seperti: "Wajar sekali...", "Kamu tidak sendirian...", "Perasaan itu sangat normal..."
3. Jika mereka stres/sedih, JANGAN langsung berikan solusi - dengarkan dulu
4. Berikan dukungan emosional sebelum saran praktis (jika diminta)
5. Gunakan emoji yang sesuai untuk menambah kehangatan 💕🌸✨🤗💪
6. Akhiri dengan kalimat yang memberi harapan atau dukungan

TOPIK YANG BISA DIBAHAS:
- Kecemasan tentang kehamilan/persalinan
- Mood swing dan perubahan emosi
- Tekanan dari keluarga/lingkungan
- Rasa lelah dan overwhelmed
- Kekhawatiran tentang bayi
- Hubungan dengan pasangan
- Perubahan tubuh dan self-image
- Baby blues dan tanda-tanda depresi
- Stres pekerjaan saat hamil
- Persiapan mental jadi ibu

TIPS YANG BISA DIBERIKAN (jika sesuai):
- Teknik pernapasan sederhana
- Journaling untuk melepas emosi
- Pentingnya istirahat dan self-care
- Kapan harus bicara dengan profesional
- Aktivitas ringan untuk mood (jalan santai, musik)

RESPONS UNTUK SITUASI DARURAT:
Jika pengguna menunjukkan tanda-tanda:
- Ingin menyakiti diri sendiri
- Depresi berat
- Pikiran berbahaya

Segera rekomendasikan untuk menghubungi:
- Hotline kesehatan jiwa: 119 ext 8
- Dokter/bidan mereka
- Keluarga terdekat

FORMAT RESPONS:
- Gunakan bahasa Indonesia yang hangat dan natural
- Paragraf pendek (2-3 kalimat)
- Berikan ruang untuk mereka berbagi lebih lanjut
- JANGAN terlalu panjang, fokus pada koneksi emosional

CONTOH RESPONS YANG BAIK:
"Hai, Bunda... 💕 Aku Oona, dan aku di sini untuk menemanimu. Ceritakan saja apa yang ada di hatimu, aku siap mendengarkan. Tidak perlu buru-buru, kita ngobrol santai saja ya... 🌸"

LARANGAN:
- Jangan memberikan diagnosis medis
- Jangan meremehkan perasaan mereka
- Jangan terlalu formal atau kaku
- Jangan langsung memberikan solusi tanpa mendengarkan
- Jangan menggunakan jargon psikologi yang kompleks`;

export async function POST(request: NextRequest) {
    try {
        if (!GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'GROQ_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const { userMessage, conversationHistory, userName, pregnancyWeek } = await request.json();

        if (!userMessage) {
            return NextResponse.json(
                { error: 'userMessage is required' },
                { status: 400 }
            );
        }

        // Build context with user info
        let contextPrompt = OONA_SYSTEM_PROMPT;
        if (userName) {
            contextPrompt += `\n\nNama ibu hamil yang sedang berbicara denganmu adalah: ${userName}`;
        }
        if (pregnancyWeek) {
            contextPrompt += `\nUsia kehamilannya saat ini: ${pregnancyWeek} minggu`;
        }

        // Build conversation
        const messages: Message[] = [];

        if (conversationHistory && Array.isArray(conversationHistory)) {
            messages.push(...conversationHistory);
        }

        messages.push({
            role: 'user',
            content: userMessage,
        });

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
                        content: contextPrompt,
                    },
                    ...messages,
                ],
                temperature: 0.85, // Slightly higher for more warmth/variety
                max_tokens: 512,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Groq API error:', error);
            return NextResponse.json(
                { error: 'Failed to get response from Oona' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || 'Maaf, aku sedang tidak bisa merespons. Coba lagi ya... 💕';

        return NextResponse.json({
            message: assistantMessage,
        });
    } catch (error) {
        console.error('Error in oona-chat API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
