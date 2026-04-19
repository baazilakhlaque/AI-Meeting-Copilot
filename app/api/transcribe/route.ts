import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-groq-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio') as File | null;
  if (!audioFile || audioFile.size === 0) {
    return Response.json({ error: 'Missing or empty audio file' }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
      temperature: 0,
    });

    const text = transcription.text?.trim() ?? '';

    // Filter out Whisper's silence/no-speech markers
    const isSilent =
      text === '' ||
      text === '[BLANK_AUDIO]' ||
      text === '[silence]' ||
      /^\[.*\]$/.test(text);

    return Response.json({ text: isSilent ? '' : text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
