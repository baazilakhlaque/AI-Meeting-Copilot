'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import ChatPanel from './ChatPanel';
import { ErrorBoundary } from './ErrorBoundary';
import SettingsModal from './SettingsModal';
import SuggestionsPanel from './SuggestionsPanel';
import TranscriptPanel from './TranscriptPanel';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useChat } from '@/hooks/useChat';
import { useSuggestions } from '@/hooks/useSuggestions';
import {
  commitSettings,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  loadSettings,
  subscribeSettings,
} from '@/lib/store';
import type { Settings, Suggestion } from '@/lib/types';

export default function AppShell() {
  // useSyncExternalStore is React's recommended API for reading external stores
  // (localStorage here). It handles SSR/hydration automatically: the server
  // uses getSettingsServerSnapshot (safe default) and the client uses
  // getSettingsSnapshot (real localStorage value) after hydration — no mismatch.
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // One-time mount: open settings immediately when no API key is stored.
  // loadSettings() is called directly (not via the hook) to avoid a stale
  // closure on `settings`, which is DEFAULT_SETTINGS on the first server pass.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!loadSettings().groqApiKey) setIsSettingsOpen(true); }, []);

  const handleSaveSettings = useCallback((next: Settings) => {
    commitSettings(next); // updates cache, persists, and notifies useSyncExternalStore
  }, []);

  const {
    transcript,
    isRecording,
    isTranscribing,
    error: audioError,
    startRecording,
    stopRecording,
  } = useAudioCapture({ apiKey: settings.groqApiKey });

  const {
    batches,
    countdown,
    isLoading: isSuggestionsLoading,
    error: suggestionsError,
    invalidKey: suggestionsInvalidKey,
    refresh,
  } = useSuggestions(transcript, settings, isRecording);

  const {
    messages,
    isStreaming,
    invalidKey: chatInvalidKey,
    sendMessage,
  } = useChat(transcript, settings);

  // Open settings if a live API call comes back with 401.
  // This is a genuine reactive side-effect (hook state → UI state), not a
  // derived-state anti-pattern, so we suppress the set-state-in-effect rule.
  const anyInvalidKey = suggestionsInvalidKey || chatInvalidKey;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (anyInvalidKey && settings.groqApiKey) setIsSettingsOpen(true);
  }, [anyInvalidKey, settings.groqApiKey]);

  const handleCardClick = useCallback(
    (suggestion: Suggestion) => {
      sendMessage(suggestion.preview, suggestion.type);
    },
    [sendMessage],
  );

  function handleExport() {
    const sessionData = {
      exportedAt: new Date().toISOString(),
      transcript: transcript.map((c) => ({
        timestamp: new Date(c.timestamp).toISOString(),
        text: c.text,
      })),
      suggestionBatches: batches.map((b) => ({
        generatedAt: new Date(b.timestamp).toISOString(),
        suggestions: b.suggestions.map((s) => ({
          type: s.type,
          preview: s.preview,
        })),
      })),
      chat: messages.map((m) => ({
        timestamp: new Date(m.timestamp).toISOString(),
        role: m.role,
        suggestionType: m.suggestionType ?? null,
        content: m.content,
      })),
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasApiKey = !!settings.groqApiKey;

  return (
    <div className="flex flex-col h-screen bg-cream overflow-hidden">
      {/* Top navigation bar — warm nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-warm-nav border-b border-warm-border">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-sage flex items-center justify-center">
            <span className="text-white font-bold text-xs"></span>
          </div>
          <h1 className="text-sm font-semibold text-charcoal">
            ListenAI <span className="font-normal text-taupe">— Live Suggestions</span>
          </h1>
          <span className="hidden md:flex items-center gap-2 text-xs text-taupe ml-2">
            <span>·</span><span>Transcript</span>
            <span>·</span><span>Live Suggestions</span>
            <span>·</span><span>Chat</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!hasApiKey && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg bg-terra-muted border border-terra-light px-3 py-1 text-xs font-medium text-terra hover:bg-terra-light/50 transition-colors"
            >
              API key required — click to set
            </button>
          )}
          {anyInvalidKey && hasApiKey && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              Invalid API key — click to fix
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={transcript.length === 0 && messages.length === 0}
            title="Export full session as JSON"
            className="flex items-center gap-1.5 rounded-lg border border-warm-border px-3 py-1.5 text-xs font-medium text-taupe hover:bg-warm-divide hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Export
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="flex items-center gap-1.5 rounded-lg border border-warm-border px-3 py-1.5 text-xs font-medium text-taupe hover:bg-warm-divide hover:text-charcoal transition-colors"
          >
            <GearIcon className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[27%] min-w-[220px] overflow-hidden">
          <ErrorBoundary label="Transcript panel error">
            <TranscriptPanel
              transcript={transcript}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              error={audioError}
              onStart={startRecording}
              onStop={stopRecording}
            />
          </ErrorBoundary>
        </div>

        <div className="w-[37%] min-w-[280px] overflow-hidden">
          <ErrorBoundary label="Suggestions panel error">
            <SuggestionsPanel
              batches={batches}
              countdown={countdown}
              isLoading={isSuggestionsLoading}
              error={suggestionsError}
              isRecording={isRecording}
              onRefresh={refresh}
              onCardClick={handleCardClick}
            />
          </ErrorBoundary>
        </div>

        <div className="flex-1 min-w-[280px] overflow-hidden">
          <ErrorBoundary label="Chat panel error">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              onSend={(text) => sendMessage(text)}
            />
          </ErrorBoundary>
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
