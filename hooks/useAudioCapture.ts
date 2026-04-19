'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptChunk } from '@/lib/types';

function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

interface UseAudioCaptureOptions {
  apiKey: string;
  chunkIntervalMs?: number;
}

interface UseAudioCaptureReturn {
  transcript: TranscriptChunk[];
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useAudioCapture({
  apiKey,
  chunkIntervalMs = 30_000,
}: UseAudioCaptureOptions): UseAudioCaptureReturn {
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);
  const apiKeyRef = useRef(apiKey);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  const transcribeBlob = useCallback(async (blob: Blob, mimeType: string): Promise<void> => {
    if (blob.size < 1000) return; // skip near-empty chunks (< ~1KB)

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      // Use a filename with the correct extension so Groq can detect format
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', blob, `chunk.${ext}`);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'x-groq-key': apiKeyRef.current },
        body: formData,
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Transcription failed' }));
        throw new Error(msg);
      }

      const { text } = await res.json();
      if (text?.trim()) {
        setTranscript((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: text.trim(), timestamp: Date.now() },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Each call to startCycle creates a fresh MediaRecorder for one 30s window.
  // When that window ends (or recording stops), onstop fires, we transcribe,
  // then immediately start the next cycle if still recording.
  const startCycle = useCallback(() => {
    if (!streamRef.current || !isRecordingRef.current) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      transcribeBlob(blob, mr.mimeType);
      // Chain the next cycle immediately if still recording
      if (isRecordingRef.current) {
        startCycle();
      }
    };

    mr.start();

    cycleTimerRef.current = setTimeout(() => {
      if (mr.state === 'recording') mr.stop();
    }, chunkIntervalMs);
  }, [chunkIntervalMs, transcribeBlob]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isRecordingRef.current = true;
      setIsRecording(true);
      startCycle();
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic access in your browser settings.'
          : 'Could not access microphone.';
      setError(msg);
    }
  }, [startCycle]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }

    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      // onstop will transcribe the remaining audio (partial chunk)
      mr.stop();
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { transcript, isRecording, isTranscribing, error, startRecording, stopRecording };
}
