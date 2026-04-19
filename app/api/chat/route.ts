import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const body = await req.json();
  const {
    content,
    context,
    history,
    model,
    systemPrompt,
    isDetailedAnswer,
    detailedAnswerPrompt,
  } = body as {
    content: string;
    context: string;
    history: HistoryMessage[];
    model: string;
    systemPrompt: string;
    isDetailedAnswer: boolean;
    detailedAnswerPrompt: string;
  };

  if (!content?.trim()) {
    return Response.json({ error: 'Empty message' }, { status: 400 });
  }

  const baseSystemPrompt = isDetailedAnswer ? detailedAnswerPrompt : systemPrompt;
  const transcriptBlock = context?.trim()
    ? `\n\n<meeting_transcript>\n${context}\n</meeting_transcript>`
    : '';
  const fullSystemPrompt = baseSystemPrompt + transcriptBlock;

  const groq = new Groq({ apiKey });

  try {
    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
