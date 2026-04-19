'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptChunk } from '@/lib/types';

function formatTimestamp(epoch: number): string {
  return new Date(epoch).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface TranscriptPanelProps {
  transcript: TranscriptChunk[];
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export default function TranscriptPanel({
  transcript,
  isRecording,
  isTranscribing,
  error,
  onStart,
  onStop,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleToggle = () => {
    if (isRecording) onStop();
    else onStart();
  };

  return (
    <div className="flex flex-col h-full bg-cream border-r border-warm-border">
      {/* Panel header — sage green */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sage-dark bg-sage">
        <span className="text-xs font-bold uppercase tracking-widest text-white/90">
          1. Mic &amp; Transcript
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isRecording
              ? 'bg-white/25 text-white'
              : 'bg-white/15 text-white/70'
          }`}
        >
          {isRecording ? 'RECORDING' : 'IDLE'}
        </span>
      </div>

      {/* Mic button area */}
      <div className="flex flex-col items-center gap-3 py-6 border-b border-warm-divide">
        <button
          onClick={handleToggle}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
            isRecording
              ? 'bg-terra hover:bg-terra-dark focus:ring-terra-light shadow-lg shadow-terra-light'
              : 'bg-terra hover:bg-terra-dark focus:ring-terra-light shadow-md shadow-terra-light/50'
          }`}
        >
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-terra animate-ping opacity-40" />
          )}
          <MicIcon className="h-7 w-7 text-white" />
        </button>

        <p className="text-sm text-taupe">
          {isRecording ? (
            <span className="flex items-center gap-1.5 font-medium text-terra">
              <span className="h-2 w-2 rounded-full bg-terra animate-pulse" />
              Recording… click to stop
            </span>
          ) : (
            'Stopped. Click to start recording.'
          )}
        </p>

        {isTranscribing && (
          <p className="text-xs text-sage animate-pulse">Transcribing…</p>
        )}

        {error && (
          <p className="mx-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 text-center">
            {error}
          </p>
        )}
      </div>

      {/* Transcript lines */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {transcript.length === 0 ? (
          <p className="text-xs text-taupe text-center pt-6">
            Transcript will appear here as you speak.
          </p>
        ) : (
          transcript.map((chunk) => (
            <div key={chunk.id}>
              <span className="block text-xs font-mono text-sage mb-0.5">
                {formatTimestamp(chunk.timestamp)}
              </span>
              <p className="text-sm leading-relaxed text-charcoal">{chunk.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
      />
    </svg>
  );
}
