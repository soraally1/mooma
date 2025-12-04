import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY3;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Kamu adalah ahli gizi dan koki profesional yang berspesialisasi dalam nutrisi ibu hamil. 
Tugasmu adalah membuatkan resep makanan yang sehat, lezat, dan aman untuk ibu hamil berdasarkan data yang diberikan.

INSTRUKSI:
1. Analisis data pengguna (alergi, preferensi, kondisi tubuh, kebutuhan nutrisi).
2. Buatkan 3 resep yang bervariasi (misal: sarapan, makan siang/malam, camilan/minuman).
3. Pastikan bahan-bahan mudah didapat di Indonesia.
4. Berikan penjelasan manfaat nutrisi spesifik untuk kehamilan.
5. Jika ada kondisi kesehatan khusus (misal: mual), sesuaikan resep untuk meredakan gejala tersebut.

FORMAT RESPONS (WAJIB JSON):
{
  "data": {
    "recipes": [
      {
        "name": "Nama Resep",
        "servings": "Jumlah Porsi (misal: 2)",
        "prepTime": "Waktu Persiapan (menit)",
        "cookTime": "Waktu Memasak (menit)",
        "description": "Deskripsi singkat yang menggugah selera",
        "ingredients": [
          {
            "item": "Nama Bahan",
            "amount": "Jumlah",
            "unit": "Satuan (gram, sdm, buah, dll)",
            "nutrition": "Kandungan utama (opsional, misal: Tinggi Zat Besi)"
          }
        ],
        "instructions": ["Langkah 1", "Langkah 2", ...],
        "nutritionBenefits": ["Manfaat 1", "Manfaat 2"],
        "tips": "Tips tambahan untuk memasak atau penyajian"
      }
    ],
    "summary": "Ringkasan singkat saran nutrisi untuk ibu",
    "warnings": "Peringatan jika ada (misal: hindari makanan mentah)"
  }
}
`;

export async function POST(request: NextRequest) {
    try {
        if (!GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'GROQ_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { allergies, preferences, bodyCondition, nutritionNeeds, dietaryRestrictions } = body;

        const userPrompt = `
Tolong buatkan resep untuk ibu hamil dengan profil berikut:
- Alergi: ${allergies || 'Tidak ada'}
- Preferensi Makanan: ${preferences || 'Tidak ada khusus'}
- Kondisi Tubuh Saat Ini: ${bodyCondition || 'Sehat'}
- Kebutuhan Nutrisi: ${nutritionNeeds || 'Umum'}
- Pantangan Lain: ${dietaryRestrictions || 'Tidak ada'}

Berikan 3 rekomendasi resep yang sesuai.
`;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { type: "json_object" }
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
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('No content received from Groq');
        }

        let parsedData;
        try {
            parsedData = JSON.parse(content);
        } catch (e) {
            console.error('JSON parse error:', e);
            // Fallback if JSON is wrapped in markdown code block
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Invalid JSON format from AI');
            }
        }

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error('Error generating recipe:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
