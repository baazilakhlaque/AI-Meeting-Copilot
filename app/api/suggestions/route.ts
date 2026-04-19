import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import type { SuggestionType } from '@/lib/types';

export const runtime = 'nodejs';

const VALID_TYPES = new Set<SuggestionType>([
  'answer',
  'question_to_ask',
  'talking_point',
  'fact_check',
  'clarification',
]);

function isValidType(t: unknown): t is SuggestionType {
  return typeof t === 'string' && VALID_TYPES.has(t as SuggestionType);
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const body = await req.json();
  const { context, prompt, model, previousPreviews = [] } = body as {
    context: string;
    prompt: string;
    model: string;
    previousPreviews: string[];
  };

  if (!context?.trim()) {
    return Response.json({ suggestions: [] });
  }

  const previousNote =
    previousPreviews.length > 0
      ? `\n\nSuggestions already shown this session (do not repeat similar ones):\n${previousPreviews.slice(-9).join('\n')}`
      : '';

  const userMessage = `Meeting transcript (most recent context):\n\n${context}${previousNote}\n\nGenerate 3 fresh, specific suggestions based on what was just discussed.`;

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';

    let suggestions: Array<{ type: SuggestionType; preview: string }> = [];
    try {
      const parsed = JSON.parse(raw);
      const arr: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.suggestions)
          ? parsed.suggestions
          : [];

      suggestions = arr
        .filter(
          (s): s is { type: SuggestionType; preview: string } =>
            typeof s === 'object' &&
            s !== null &&
            isValidType((s as Record<string, unknown>).type) &&
            typeof (s as Record<string, unknown>).preview === 'string',
        )
        .slice(0, 3);
    } catch {
      suggestions = [];
    }

    return Response.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Suggestions failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
