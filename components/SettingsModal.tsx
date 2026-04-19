'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import type { Settings } from '@/lib/types';

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  function handleReset() {
    setDraft(DEFAULT_SETTINGS);
  }

  const inputClass =
    'w-full rounded-lg border border-warm-border px-3 py-2 text-sm text-charcoal bg-cream placeholder-taupe focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage-light transition-colors';
  const monoInputClass =
    'w-full rounded-lg border border-warm-border px-3 py-2 text-xs font-mono text-charcoal bg-cream placeholder-taupe focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage-light transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-cream-card shadow-2xl border border-warm-border">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-warm-border bg-cream-card px-6 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-taupe hover:bg-warm-divide hover:text-charcoal transition-colors"
            aria-label="Close settings"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* API Key */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage">
              Authentication
            </h3>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">Groq API Key</span>
              <input
                type="password"
                value={draft.groqApiKey}
                onChange={(e) => update('groqApiKey', e.target.value)}
                placeholder="gsk_..."
                className={inputClass + ' font-mono'}
              />
              <p className="mt-1 text-xs text-taupe">
                Your key is stored only in your browser and sent directly to Groq.
              </p>
            </label>
          </section>

          {/* Model */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage">
              Model
            </h3>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">Model Slug</span>
              <input
                type="text"
                value={draft.modelSlug}
                onChange={(e) => update('modelSlug', e.target.value)}
                className={inputClass + ' font-mono'}
              />
            </label>
          </section>

          {/* Context Windows */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage">
              Context Windows
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">
                  Suggestion context (chars)
                </span>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={500}
                  value={draft.suggestionContextChars}
                  onChange={(e) => update('suggestionContextChars', Number(e.target.value))}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-taupe">
                  ~{Math.round(draft.suggestionContextChars / 4)} tokens
                </p>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">
                  Chat context (chars)
                </span>
                <input
                  type="number"
                  min={500}
                  max={100000}
                  step={1000}
                  value={draft.chatContextChars}
                  onChange={(e) => update('chatContextChars', Number(e.target.value))}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-taupe">
                  ~{Math.round(draft.chatContextChars / 4)} tokens
                </p>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">
                Auto-refresh interval (seconds)
              </span>
              <input
                type="number"
                min={10}
                max={120}
                step={5}
                value={draft.refreshIntervalSeconds}
                onChange={(e) => update('refreshIntervalSeconds', Number(e.target.value))}
                className={'w-48 rounded-lg border border-warm-border px-3 py-2 text-sm text-charcoal bg-cream focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage-light'}
              />
            </label>
          </section>

          {/* Prompts */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage">
              Prompts
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">
                  Live suggestions prompt (system)
                </span>
                <textarea
                  rows={6}
                  value={draft.suggestionPrompt}
                  onChange={(e) => update('suggestionPrompt', e.target.value)}
                  className={monoInputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">
                  Detailed answer prompt (on card click)
                </span>
                <textarea
                  rows={5}
                  value={draft.detailedAnswerPrompt}
                  onChange={(e) => update('detailedAnswerPrompt', e.target.value)}
                  className={monoInputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-charcoal">
                  Chat prompt (typed messages)
                </span>
                <textarea
                  rows={5}
                  value={draft.chatSystemPrompt}
                  onChange={(e) => update('chatSystemPrompt', e.target.value)}
                  className={monoInputClass}
                />
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-warm-border bg-cream px-6 py-4">
          <button
            onClick={handleReset}
            className="text-sm font-medium text-taupe hover:text-charcoal transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-warm-border px-4 py-2 text-sm font-medium text-taupe hover:bg-warm-divide hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-terra px-4 py-2 text-sm font-medium text-white hover:bg-terra-dark transition-colors"
            >
              Save settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
