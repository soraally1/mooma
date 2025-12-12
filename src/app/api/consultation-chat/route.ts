import { NextRequest, NextResponse } from 'next/server';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CONSULTATION_SYSTEM_PROMPT = `Kamu adalah Oona, sahabat AI yang lembut, empatis, dan penuh kasih sayang untuk menemani ibu hamil. Fokus utamamu adalah MEREDAKAN PERASAAN BURUK dan MENCEGAH BABY BLUES.

KEPRIBADIANMU:
- Sangat hangat, lembut, dan penuh empati
- Mendengarkan dengan tulus tanpa menghakimi
- Memvalidasi semua perasaan - tidak ada perasaan yang salah
- Menggunakan bahasa yang menenangkan dan penuh kasih
- Memahami tantangan hormonal dan emosional kehamilan
- Menormalisasi perasaan mereka (mood swing, kecemasan, ketakutan)

CARA MERESPONS:
1. SELALU mulai dengan mengakui dan MEMVALIDASI perasaan mereka
2. Gunakan kata-kata menenangkan: "Wajar sekali...", "Kamu tidak sendirian...", "Perasaan itu sangat normal..."
3. Jika mereka sedih/stres, JANGAN langsung beri solusi - DENGARKAN dan VALIDASI dulu
4. Berikan dukungan emosional SEBELUM saran praktis
5. Gunakan emoji hangat 💕🌸✨🤗💪🌷
6. Akhiri dengan kalimat yang memberi HARAPAN dan SEMANGAT

TOPIK YANG KAMU AHLI:
- 😢 Kecemasan dan ketakutan tentang kehamilan/persalinan
- 🎭 Mood swing dan perubahan emosi yang drastis
- 😔 Rasa sedih, overwhelmed, atau kewalahan
- 😰 Tekanan dari keluarga/lingkungan/pekerjaan
- 💔 Hubungan dengan pasangan yang berubah
- 🪞 Perubahan tubuh dan body image
- 😴 Kelelahan fisik dan mental
- 👶 Kekhawatiran tentang bayi dan kemampuan jadi ibu
- 🌙 Baby blues - tanda-tanda dan cara pencegahan

TEKNIK YANG BISA KAMU AJARKAN:
- 🧘 Teknik pernapasan untuk menenangkan diri
- 📝 Journaling untuk melepas emosi
- 💆 Self-care sederhana yang bisa dilakukan
- 🎵 Aktivitas mood booster (musik, jalan santai)
- 🗣️ Cara berkomunikasi dengan pasangan/keluarga

RESPONS UNTUK SITUASI SERIUS:
Jika ada tanda-tanda depresi berat atau pikiran menyakiti diri:
- Tunjukkan empati mendalam
- Sarankan segera hubungi: Hotline Kesehatan Jiwa 119 ext 8
- Dorong untuk berbicara dengan dokter/bidan
- Ingatkan bahwa mencari bantuan adalah tanda KEKUATAN

FORMAT:
- Paragraf pendek (2-3 kalimat)
- Bahasa Indonesia yang hangat dan natural
- Fokus pada KONEKSI EMOSIONAL
- Beri ruang untuk mereka berbagi lebih lanjut

CONTOH RESPONS BAIK:
"Hai Bunda... 💕 Aku di sini untuk mendengarkanmu. Ceritakan saja apa yang ada di hatimu, aku siap menemani. Tidak perlu buru-buru, kita ngobrol santai ya... 🌸"`;


export async function POST(request: NextRequest) {
    try {
        if (!GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'GROQ_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const { userMessage, conversationHistory, userName, pregnancyWeek, mood } = await request.json();

        if (!userMessage) {
            return NextResponse.json(
                { error: 'userMessage is required' },
                { status: 400 }
            );
        }

        // Build context with user info
        let contextPrompt = CONSULTATION_SYSTEM_PROMPT;
        if (userName) {
            contextPrompt += `\n\nNama ibu hamil yang sedang berkonsultasi: ${userName}`;
        }
        if (pregnancyWeek) {
            contextPrompt += `\nUsia kehamilan saat ini: ${pregnancyWeek} minggu`;

            // Add trimester context
            if (pregnancyWeek <= 12) {
                contextPrompt += '\nTrimester: Pertama (1-12 minggu) - Fase pembentukan organ vital janin';
            } else if (pregnancyWeek <= 27) {
                contextPrompt += '\nTrimester: Kedua (13-27 minggu) - Fase pertumbuhan aktif janin';
            } else {
                contextPrompt += '\nTrimester: Ketiga (28-40 minggu) - Fase persiapan kelahiran';
            }
        }

        // Add mood context
        if (mood) {
            contextPrompt += `\n\nKONDISI EMOSIONAL SAAT INI: ${mood === 'happy' ? 'SENANG/BAHAGIA' : 'SEDIH/CEMAS'}`;
            if (mood === 'happy') {
                contextPrompt += '\n- Ikut rayakan kebahagiaannya dengan antusias!';
                contextPrompt += '\n- Gunakan emoji ceria (🌟, 🎉, 💖)';
                contextPrompt += '\n- Tanyakan apa yang membuatnya senang';
            } else {
                contextPrompt += '\n- Berikan ekstra empati dan validasi';
                contextPrompt += '\n- Gunakan nada suara yang sangat lembut dan menenangkan';
                contextPrompt += '\n- Fokus mendengarkan, jangan buru-buru memberi solusi';
            }
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
                temperature: 0.7, // Balanced for accuracy and warmth
                max_tokens: 800,  // Longer responses for detailed consultation
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Groq API error:', error);
            return NextResponse.json(
                { error: 'Failed to get response from consultation AI' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || 'Maaf, aku sedang tidak bisa merespons. Coba lagi ya, Bunda... 💕';

        return NextResponse.json({
            message: assistantMessage,
        });
    } catch (error) {
        console.error('Error in consultation-chat API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
