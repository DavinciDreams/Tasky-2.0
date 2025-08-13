# Tasky Agentic Chat – Architecture and Usage

This document describes how Tasky’s in‑app AI chat works, how it integrates with provider SDKs, and how it complements the MCP tool layer.

## Goals

- Lightweight in‑app chat for quick Q&A and coding assistance
- Streaming responses with stop control
- Configurable provider, model, system prompt, and temperature
- No server required; runs entirely in the renderer using provider SDKs

## Components

- `src/components/apps/ChatModule.tsx` – React component implementing the chat UI and logic
- UI dependencies: `ai` (Vercel AI SDK), `@ai-sdk/openai`, `@ai-sdk/openai-compatible`, Tailwind‑based UI components

## Data flow

1. User types a message → stored in local React state as `messages`
2. On send:
   - Compose a text prompt from optional system prompt + conversation transcript
   - Select model client based on `settings.llmProvider` and `settings.llmModel`
   - Call `streamText({ model, prompt, temperature })` to receive a token stream
   - Append tokens to the last assistant message in state for incremental rendering
3. User can press Stop → abort controller cancels the stream

## Providers and models

- Provider is selected from app settings (`settings.llmProvider`):
  - `openai`: uses `createOpenAI({ apiKey })`, models mapped to `o4-mini`/`o4`
  - `lm-studio`: uses `createOpenAICompatible({ baseURL })`, default `llama-3.2-1b`
  - `custom`: supported by using the same OpenAI‑compatible client (set base URL and key in settings)

Model resolution:

- OpenAI: user input is normalized; `gpt-4o*` and `gpt-5*` variants map to `o4`/`o4-mini`
- LM Studio / Custom: free‑text model id is passed through

## Prompt construction

- System prompt (optional) is prepended as plain text
- Conversation history is flattened into text lines in the form `User: ...` / `Assistant: ...`
- The combined prompt is sent as a single text input to `streamText`

## Controls

- Temperature: `0.0 – 2.0` with 0.05 steps; lower is more focused
- Stop: cancels the active stream via `AbortController`
- Settings modal: system prompt editor, temperature slider, provider/model selectors

## Error handling

- Any provider/streaming error is captured and displayed as a toast and inline error state
- Unsupported providers trigger a warning message

## Persisted settings

- The chat uses global app settings (`settings`) driven by the main Settings UI
- Relevant keys: `llmProvider`, `llmModel`, `llmApiKey`, `llmBaseUrl`

## Relationship to MCP tools

- The chat module is independent from MCP; it does not call MCP tools directly
- MCP tools manage tasks/reminders via SQLite and the Electron app’s HTTP bridge
- Typical workflow: use chat for ideation; use Tasks UI or MCP tools for tracked work

## Extensibility

- Add providers: create additional clients (e.g., Anthropic, Google) and extend the provider switch
- Add structured prompts: replace text‑only transcript with an array of role‑tagged messages if the SDK supports it
- Add function calling / tools: wire MCP tools or local helpers into the chat loop as needed

## Security and privacy

- API keys are read from app settings and used only client‑side for requests to configured endpoints
- No conversation state is persisted beyond in‑memory React state (unless you add persistence)

## Minimal example

High‑level send flow used in the component:

```ts
const model = provider === 'lm-studio'
  ? lmStudioClient(settings.llmModel)
  : openaiClient.responses(openaiModelId);

const { textStream } = await streamText({ model, prompt, temperature });
for await (const token of textStream) {
  // append token to last assistant message in state
}
```

## Known limitations

- The prompt is constructed as a single text block; if you need role‑aware inputs, adapt to a messages array supported by your provider
- Images/files are not currently supported in the chat input
- Only streaming text responses are implemented


