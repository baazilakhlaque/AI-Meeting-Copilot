'use client';

import { useCallback, useRef, useState } from 'react';
import type { ChatMessage, Settings, SuggestionType, TranscriptChunk } from '@/lib/types';

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  invalidKey: boolean;
  sendMessage: (content: string, suggestionType?: SuggestionType) => Promise<void>;
}

export function useChat(
  transcript: TranscriptChunk[],
  settings: Settings,
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [invalidKey, setInvalidKey] = useState(false);

  // Keep refs so the callback never captures stale values
  const transcriptRef = useRef(transcript);
  const settingsRef = useRef(settings);
  const messagesRef = useRef(messages);

  // Sync refs on every render
  transcriptRef.current = transcript;
  settingsRef.current = settings;
  messagesRef.current = messages;

  const sendMessage = useCallback(async (content: string, suggestionType?: SuggestionType) => {
    const s = settingsRef.current;
    if (!s.groqApiKey || !content.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      suggestionType,
      timestamp: Date.now(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    const context = transcriptRef.current
      .map((c) => c.text)
      .join(' ')
      .slice(-s.chatContextChars);

    // Build history from messages BEFORE the new pair (use ref to get current state)
    const history = messagesRef.current.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'x-groq-key': s.groqApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          context,
          history,
          model: s.modelSlug,
          systemPrompt: s.chatSystemPrompt,
          isDetailedAnswer: !!suggestionType,
          detailedAnswerPrompt: s.detailedAnswerPrompt,
        }),
      });

      if (res.status === 401) {
        setInvalidKey(true);
        throw new Error('Invalid or missing Groq API key.');
      }
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Chat request failed');
        throw new Error(errText);
      }
      setInvalidKey(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Chat failed';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Error: ${errMsg}` } : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  return { messages, isStreaming, invalidKey, sendMessage };
}
