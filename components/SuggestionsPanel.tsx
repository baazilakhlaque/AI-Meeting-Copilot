'use client';

import type { Suggestion, SuggestionBatch, SuggestionType } from '@/lib/types';

const TYPE_CONFIG: Record<
  SuggestionType,
  { label: string; badgeClass: string; borderClass: string }
> = {
  answer: {
    label: 'ANSWER',
    badgeClass: 'bg-badge-teal text-white',
    borderClass: 'border-l-[#5c8f7a]',
  },
  question_to_ask: {
    label: 'QUESTION TO ASK',
    badgeClass: 'bg-badge-teal text-white',
    borderClass: 'border-l-[#5c8f7a]',
  },
  talking_point: {
    label: 'TALKING POINT',
    badgeClass: 'bg-badge-amber text-white',
    borderClass: 'border-l-[#c49a3c]',
  },
  fact_check: {
    label: 'FACT-CHECK',
    badgeClass: 'bg-badge-rose text-white',
    borderClass: 'border-l-[#b5636a]',
  },
  clarification: {
    label: 'CLARIFICATION',
    badgeClass: 'bg-badge-purple text-white',
    borderClass: 'border-l-[#7c6f9e]',
  },
};

function formatBatchTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  dimmed: boolean;
  onClick: () => void;
}

function SuggestionCard({ suggestion, dimmed, onClick }: SuggestionCardProps) {
  const config = TYPE_CONFIG[suggestion.type];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border border-warm-border bg-cream-card p-4 border-l-4 ${config.borderClass} hover:shadow-md hover:border-warm-border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage-light ${
        dimmed ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${config.badgeClass}`}
      >
        {config.label}
      </span>
      <p className="text-sm leading-relaxed text-charcoal">{suggestion.preview}</p>
    </button>
  );
}

interface SuggestionsPanelProps {
  batches: SuggestionBatch[];
  countdown: number;
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
  onRefresh: () => void;
  onCardClick: (suggestion: Suggestion) => void;
}

export default function SuggestionsPanel({
  batches,
  countdown,
  isLoading,
  error,
  isRecording,
  onRefresh,
  onCardClick,
}: SuggestionsPanelProps) {
  return (
    <div className="flex flex-col h-full bg-cream-mid border-r border-warm-border">
      {/* Panel header — sage green */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sage-dark bg-sage">
        <span className="text-xs font-bold uppercase tracking-widest text-white/90">
          2. Live Suggestions
        </span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
          {batches.length} {batches.length === 1 ? 'BATCH' : 'BATCHES'}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-divide bg-cream-card">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-terra text-terra px-3 py-1.5 text-xs font-medium hover:bg-terra-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-transparent"
        >
          <RefreshIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing…' : 'Reload suggestions'}
        </button>

        {isRecording && (
          <span className="text-xs text-taupe">
            auto-refresh in{' '}
            <span className="font-mono font-semibold text-charcoal">{countdown}s</span>
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Suggestion batches */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {batches.length === 0 && !isLoading && (
          <div className="pt-8 text-center">
            <p className="text-xs text-taupe leading-relaxed">
              {isRecording
                ? 'Suggestions will appear once enough transcript context is captured.'
                : 'Start recording, then suggestions will auto-refresh every 30s.'}
            </p>
          </div>
        )}

        {batches.map((batch, batchIndex) => {
          const isDimmed = batchIndex > 0;
          const batchNumber = batchIndex + 1;
          return (
            <div key={batch.id}>
              {batchIndex > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-warm-divide" />
                  <span className="text-[10px] font-medium text-taupe whitespace-nowrap">
                    — BATCH {batchNumber} · {formatBatchTime(batch.timestamp)} —
                  </span>
                  <div className="flex-1 h-px bg-warm-divide" />
                </div>
              )}

              <div className="space-y-2">
                {batch.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    dimmed={isDimmed}
                    onClick={() => onCardClick(suggestion)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-warm-border bg-cream-card p-4 border-l-4 border-l-warm-border animate-pulse"
              >
                <div className="h-3 w-24 rounded bg-warm-divide mb-3" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-warm-divide/60" />
                  <div className="h-3 w-3/4 rounded bg-warm-divide/60" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}
