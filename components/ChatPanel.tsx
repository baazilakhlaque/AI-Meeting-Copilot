'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, SuggestionType } from '@/lib/types';

const TYPE_LABEL: Record<SuggestionType, string> = {
  answer: 'ANSWER',
  question_to_ask: 'QUESTION TO ASK',
  talking_point: 'TALKING POINT',
  fact_check: 'FACT-CHECK',
  clarification: 'CLARIFICATION',
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-charcoal mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-charcoal mt-4 mb-1.5 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-charcoal mt-3 mb-1 first:mt-0">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed text-charcoal mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-charcoal">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-taupe">{children}</em>,
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-4 mb-2 space-y-1 text-sm text-charcoal">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-4 mb-2 space-y-1 text-sm text-charcoal">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        hr: () => <hr className="my-3 border-warm-divide" />,
        code: ({ children, className }) => {
          const isBlock = className?.startsWith('language-');
          if (isBlock) {
            return (
              <code className="block rounded-lg bg-cream-mid border border-warm-border px-3 py-2 text-xs font-mono text-charcoal overflow-x-auto my-2 whitespace-pre">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded px-1 py-0.5 bg-cream-mid text-xs font-mono text-sage-dark">
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-sage-light pl-3 my-2 text-taupe italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse border border-warm-border rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-sage-muted text-sage-dark">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-warm-divide">{children}</tbody>
        ),
        tr: ({ children }) => <tr className="hover:bg-cream transition-colors">{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-sage-dark border-b border-warm-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-charcoal border-r border-warm-divide last:border-r-0">
            {children}
          </td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sage-dark underline underline-offset-2 hover:text-sage"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const roleLabel = isUser
    ? message.suggestionType
      ? `YOU — ${TYPE_LABEL[message.suggestionType]}`
      : 'YOU'
    : 'ASSISTANT';

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-taupe px-1">
        {roleLabel}
      </span>

      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'max-w-[85%] bg-terra text-white rounded-tr-sm'
            : 'w-full bg-cream-card border border-warm-border border-l-4 border-l-sage rounded-tl-sm'
        }`}
      >
        {message.content ? (
          isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )
        ) : (
          <span className="inline-flex gap-1 items-center text-taupe">
            <span className="h-1.5 w-1.5 rounded-full bg-warm-border animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-warm-border animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-warm-border animate-bounce [animation-delay:300ms]" />
          </span>
        )}
      </div>
    </div>
  );
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (content: string) => void;
}

export default function ChatPanel({ messages, isStreaming, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-cream">
      {/* Panel header — sage green */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sage-dark bg-sage">
        <span className="text-xs font-bold uppercase tracking-widest text-white/90">
          3. Chat (Detailed Answers)
        </span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
          SESSION-ONLY
        </span>
      </div>

      {/* Hint text */}
      <div className="px-4 py-3 border-b border-warm-divide bg-cream-mid">
        <p className="text-xs text-taupe leading-relaxed">
          Clicking a suggestion adds it to this chat and streams a detailed answer (separate prompt,
          more context). You can also type questions directly. One continuous chat per session — no
          persistence on reload.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-taupe pt-6">
            Click a suggestion or type a question below.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-warm-border bg-cream-card px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-warm-border bg-cream px-4 py-2.5 text-sm text-charcoal placeholder-taupe focus:border-sage focus:bg-cream-card focus:outline-none focus:ring-2 focus:ring-sage-light disabled:opacity-60 transition-colors max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 rounded-xl bg-terra px-4 py-2.5 text-sm font-semibold text-white hover:bg-terra-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-taupe">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
