# AI Meeting Copilot

A real-time AI meeting copilot that listens to live audio, continuously surfaces contextual suggestions while you talk, and allows users to chat with those suggestions. Three-column layout: live transcript on the left, smart suggestions in the middle, and a detailed chat panel on the right.

I plan on converting this into an extension later on (will update here!)

Deployed Link: https://ai-meeting-copilot-lac.vercel.app/

## Setup

### Prerequisites

- Node.js >= 18
- A [Groq API key](https://console.groq.com) (free tier works)

### Local Development

```bash
git clone <your-repo-url>
cd ai-meeting-copilot
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load, the Settings modal opens automatically — paste your Groq API key and click **Save settings**.

---

## Tech Stack

**Framework**: Next.js 16 (App Router) (API routes + React in one repo; zero-config Vercel deploy)
**Language**: TypeScript (Typed suggestion/chat message shapes prevent runtime shape bugs)
**Styling**: Tailwind CSS v4 (Utility-first; rapid iteration on the 3-column layout)
**Transcription**: Groq Whisper Large V3 (Best open-source STT accuracy; ~500 tokens/s on Groq)
**LLM**: Groq `openai/gpt-oss-120b` (GPT-class quality at Groq inference speeds (~500 tok/s))
**Audio**: MediaRecorder (browser) (No native bindings needed; works in all modern browsers)
**State**: React hooks + refs (No global store needed at this scope; refs prevent stale closures |)

## Architecture

```
Browser                           Next.js API Routes          Groq
────────────────────────────────  ─────────────────────────  ──────────────────
MediaRecorder (30s cycles)  ──►  POST /api/transcribe    ──► Whisper Large V3
transcript state            ──►  POST /api/suggestions   ──► openai/gpt-oss-120b
click suggestion / type     ──►  POST /api/chat          ──► openai/gpt-oss-120b
                                                              (streaming)
localStorage                ──►  (x-groq-key header on every request)
```

API key never touches server state — it's stored in `localStorage` and sent as `x-groq-key` on every request. The server reads it and forwards it to Groq, then discards it.


---

## Prompt Strategy

### Live Suggestions (every 30s)

**Context passed:** Last 6,000 characters of accumulated transcript (~1,500 tokens). Using a sliding window of recent speech means suggestions stay relevant without exhausting the context window or slowing response time.

**Model instruction:** Returns a JSON object `{"suggestions": [...]}` with exactly 3 items, each having a `type` and `preview`. Using `response_format: { type: "json_object" }` guarantees parseable output.

**Type selection logic (model-driven):** The system prompt defines 5 types and their appropriate use cases:
- `answer` — when a question was just asked or a problem stated; give the direct answer
- `question_to_ask` — when a topic needs deeper exploration; suggest a specific follow-up
- `talking_point` — when there's a relevant insight or data point worth raising
- `fact_check` — when a claim needs verification or nuance
- `clarification` — when ambiguous terminology or concepts should be surfaced

The model decides the mix. The prompt explicitly penalizes repeating the same type three times, ensuring variety per batch. Previously-shown previews are also passed so the model avoids literal repetition across batches.

**Tradeoff:** 6,000 chars is conservative. A longer window would give the model more context but increase latency. At ~500 tokens/s on Groq, even 2,000 tokens returns in under a second, so the window could be extended without much cost, but recent context is usually most useful for suggestions anyway.

### Detailed Answer (on card click)

**Context passed:** Last 20,000 characters of transcript (~5,000 tokens) — the full session up to model limit. When you click a suggestion, you want deep context, not just the last 30 seconds.

**Separate system prompt:** Switches from the suggestion prompt to a `DETAILED_ANSWER_PROMPT` that instructs the model to expand on the suggestion with structure, specific references to what was said, and actionable content (200–350 words).

**Tradeoff:** This makes card clicks slower than regular suggestions (more tokens in context), but the user expectation is different — clicking expects a thorough answer, not a quick snippet.

### Chat (typed messages)

**Context passed:** Same 20,000 character window, passed as a `<meeting_transcript>` XML block in the system message. Full chat history is passed as prior `user`/`assistant` message pairs so the model can refer back to earlier turns.

**System prompt emphasis:** References actual names, numbers, and statements from the transcript. Stays concise for simple questions, uses structure for complex ones.

**Streaming:** Uses Groq's streaming API. The route returns a `ReadableStream` and the client reads tokens incrementally with `ReadableStream.getReader()`, appending each chunk to the assistant message in state. First token appears in under 500ms.

---

## Key Tradeoffs

**30s fixed chunks vs. VAD:** Voice activity detection would produce better natural-speech boundaries, but adds significant complexity. Fixed 30s cycles are simple, reliable, and produce complete audio blobs that Whisper handles well. Each cycle creates a fresh `MediaRecorder` instance so every blob is a valid, self-contained audio file.

**Single `useAudioCapture` hook vs. separate audio/transcription:** Keeps the mic state and transcription state co-located, which simplifies the retry/error cycle. The alternative (emit blobs, transcribe separately) adds an async queue that isn't needed at this scale.

**`json_object` format for suggestions:** Requires the LLM response to be a valid JSON object. More reliable than parsing JSON from freeform text, at the cost of needing the wrapper `{"suggestions": [...]}` structure instead of a raw array.

---

## File Structure

```
ai-meeting-copilot/
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   ├── page.tsx                # Renders <AppShell /> (server component shell)
│   ├── globals.css             # Tailwind import + CSS custom properties
│   └── api/
│       ├── transcribe/route.ts # Groq Whisper Large V3
│       ├── suggestions/route.ts# Groq GPT-OSS 120B → JSON suggestions
│       └── chat/route.ts       # Groq GPT-OSS 120B → streaming response
├── components/
│   ├── AppShell.tsx            # Top-level client component; all state + layout
│   ├── TranscriptPanel.tsx     # Left column: mic button + transcript chunks
│   ├── SuggestionsPanel.tsx    # Middle column: batched suggestion cards
│   ├── ChatPanel.tsx           # Right column: streaming chat thread + input
│   ├── SettingsModal.tsx       # Modal: API key, prompts, context windows
│   └── ErrorBoundary.tsx       # Class component error boundary per panel
├── hooks/
│   ├── useAudioCapture.ts      # MediaRecorder lifecycle + Whisper transcription
│   ├── useSuggestions.ts       # 30s interval, batch state, manual refresh
│   └── useChat.ts              # Message state, streaming reader, invalid key detection
└── lib/
    ├── types.ts                # All shared TypeScript interfaces
    ├── defaults.ts             # Default prompts, model slug, context sizes
    └── store.ts                # Typed localStorage read/write helpers
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
