import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Anda adalah seorang dokter spesialis kandungan dan ahli gizi terkemuka yang berfokus pada kesehatan ibu hamil. 
Tugas Anda adalah menganalisis foto makanan dan memberikan saran nutrisi yang sangat mendetail, akurat secara medis, namun mudah dimengerti oleh ibu hamil dari berbagai kalangan.

Analisis gambar tersebut dan kembalikan objek JSON dengan struktur berikut (pastikan semua teks dalam Bahasa Indonesia):
{
  "foodName": "Nama makanan yang teridentifikasi",
  "calories": "Perkiraan kalori (contoh: '350 kkal')",
  "verdict": "Safe" | "Limit" | "Avoid",
  "nutrition": {
    "protein": "contoh: '15g' (HANYA angka dan 'g', jangan ada teks lain)",
    "vitamins": "Vitamin utama yang terkandung (contoh: 'Vitamin C, Zat Besi')",
    "carbs": "contoh: '40g' (HANYA angka dan 'g')",
    "fat": "contoh: '10g' (HANYA angka dan 'g')"
  },
  "benefits": ["Sebutkan 3-4 manfaat spesifik untuk kehamilan dan perkembangan janin. Jelaskan 'mengapa' itu baik secara medis namun bahasa sederhana."],
  "risks": ["Sebutkan potensi risiko jika ada (misal: merkuri tinggi, bakteri, gula berlebih). Jelaskan bahayanya bagi janin/ibu."],
  "advice": "Paragraf nasihat yang hangat, empatik, dan edukatif. Jelaskan porsi yang disarankan, cara pengolahan yang lebih sehat, atau alternatif jika makanan ini kurang baik. Gunakan sapaan 'Bunda' atau 'Moms'."
}

PENTING:
1. Pastikan nilai nutrisi (protein, carbs, fat) formatnya konsisten angka diikuti 'g' tanpa spasi (misal: '15g').
2. Penjelasan harus mendalam tapi tidak menakut-nakuti.
3. Gunakan standar kesehatan ibu hamil (Kemenkes RI / WHO).
4. Output WAJIB JSON valid tanpa markdown.`;

export async function POST(req: NextRequest) {
    if (!GROQ_API_KEY) {
        return NextResponse.json({ error: 'Groq API Key not configured' }, { status: 500 });
    }

    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
        }

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct', // User specified model
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: SYSTEM_PROMPT },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image, // Expecting base64 data url
                                },
                            },
                        ],
                    },
                ],
                temperature: 0.5,
                max_tokens: 1024,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Groq API Error:', errorData);
            return NextResponse.json({ error: 'Failed to analyze food' }, { status: response.status });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            return NextResponse.json({ error: 'No analysis generated' }, { status: 500 });
        }

        let analysisData;
        try {
            analysisData = JSON.parse(content);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
        }

        return NextResponse.json({ data: analysisData });

    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
