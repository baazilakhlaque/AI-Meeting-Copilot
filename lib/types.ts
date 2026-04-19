export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number; // epoch ms
}

export type SuggestionType =
  | 'answer'
  | 'question_to_ask'
  | 'talking_point'
  | 'fact_check'
  | 'clarification';

export interface Suggestion {
  id: string;
  batchId: string;
  type: SuggestionType;
  preview: string;
  timestamp: number;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestionType?: SuggestionType;
  timestamp: number;
}

export interface Settings {
  groqApiKey: string;
  modelSlug: string;
  suggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatSystemPrompt: string;
  suggestionContextChars: number;
  chatContextChars: number;
  refreshIntervalSeconds: number;
}
