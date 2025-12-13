import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are an expert nutritionist specializing in pregnancy nutrition. 
Your task is to analyze food images and provide nutritional advice for pregnant women.

Analyze the image and return a JSON object with the following structure:
{
  "foodName": "Name of the food identified",
  "calories": "Estimated calories (e.g., '350 kcal')",
  "verdict": "Safe" | "Limit" | "Avoid",
  "nutrition": {
    "protein": "e.g., 15g",
    "vitamins": "Key vitamins present (e.g., 'Vitamin C, Iron')",
    "carbs": "e.g., 40g",
    "fat": "e.g., 10g"
  },
  "benefits": ["List of 2-3 benefits for pregnancy (The Good)"],
  "risks": ["List of potential risks if any (The Bad)"],
  "advice": "A short, friendly advice paragraph for the mom-to-be."
}

Ensure the output is valid JSON. Do not include markdown formatting or extra text.`;

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
