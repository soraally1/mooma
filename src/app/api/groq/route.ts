import { NextRequest, NextResponse } from 'next/server';
import GroqService from '@/lib/groq';

// Store conversation history per session
const conversationSessions = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle extract endpoint
    if (pathname.includes('/api/groq/extract')) {
      const { conversationSummary } = await request.json();

      if (!conversationSummary) {
        return NextResponse.json(
          { error: 'Conversation summary is required' },
          { status: 400 }
        );
      }

      const extractedData = await GroqService.extractPregnancyData(conversationSummary);
      return NextResponse.json({ data: extractedData });
    }

    // Handle regular message endpoint
    const { message, sessionId } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Message and sessionId are required' },
        { status: 400 }
      );
    }

    // Initialize session if needed
    if (!conversationSessions.has(sessionId)) {
      GroqService.clearHistory();
      conversationSessions.set(sessionId, true);
    }

    // Send message and get response
    const response = await GroqService.sendMessage(message);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Groq API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
