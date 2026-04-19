'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings, Suggestion, SuggestionBatch, TranscriptChunk } from '@/lib/types';

interface UseSuggestionsReturn {
  batches: SuggestionBatch[];
  countdown: number;
  isLoading: boolean;
  error: string | null;
  invalidKey: boolean;
  refresh: () => void;
}

export function useSuggestions(
  transcript: TranscriptChunk[],
  settings: Settings,
  isRecording: boolean,
): UseSuggestionsReturn {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [countdown, setCountdown] = useState(settings.refreshIntervalSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidKey, setInvalidKey] = useState(false);

  // Keep refs fresh so interval callback always sees latest values
  const transcriptRef = useRef(transcript);
  const settingsRef = useRef(settings);
  const batchesRef = useRef(batches);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { batchesRef.current = batches; }, [batches]);

  const isLoadingRef = useRef(false);

  const fetchSuggestions = useCallback(async () => {
    const s = settingsRef.current;
    if (!s.groqApiKey || isLoadingRef.current) return;

    const fullText = transcriptRef.current.map((c) => c.text).join(' ');
    if (!fullText.trim()) return;

    const context = fullText.slice(-s.suggestionContextChars);

    // Collect all previously shown previews to avoid repetition
    const previousPreviews = batchesRef.current
      .flatMap((b) => b.suggestions.map((sg) => sg.preview));

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'x-groq-key': s.groqApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          prompt: s.suggestionPrompt,
          model: s.modelSlug,
          previousPreviews,
        }),
      });

      if (res.status === 401) {
        setInvalidKey(true);
        throw new Error('Invalid or missing Groq API key.');
      }
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Failed to fetch suggestions' }));
        throw new Error(msg);
      }
      setInvalidKey(false);

      const { suggestions: raw } = await res.json();
      if (!Array.isArray(raw) || raw.length === 0) return;

      const batchId = crypto.randomUUID();
      const batchTimestamp = Date.now();
      const newBatch: SuggestionBatch = {
        id: batchId,
        timestamp: batchTimestamp,
        suggestions: raw.map(
          (s: { type: Suggestion['type']; preview: string }): Suggestion => ({
            id: crypto.randomUUID(),
            batchId,
            type: s.type,
            preview: s.preview,
            timestamp: batchTimestamp,
          }),
        ),
      };

      setBatches((prev) => [newBatch, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestion fetch failed');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Manual refresh — callable from UI
  const refresh = useCallback(() => {
    setCountdown(settingsRef.current.refreshIntervalSeconds);
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Auto-refresh interval — only active while recording
  useEffect(() => {
    if (!isRecording) return;

    setCountdown(settings.refreshIntervalSeconds);
    let secs = settings.refreshIntervalSeconds;

    const interval = setInterval(() => {
      secs -= 1;
      setCountdown(secs);

      if (secs <= 0) {
        fetchSuggestions();
        secs = settings.refreshIntervalSeconds;
        setCountdown(secs);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, settings.refreshIntervalSeconds, fetchSuggestions]);

  return { batches, countdown, isLoading, error, invalidKey, refresh };
}
