# SYLQEN AI Architecture

SYLQEN is AI-ready from Phase 1 without requiring an API key or vendor SDK.

## Goals

- Keep business logic provider-agnostic
- Allow Anthropic, OpenAI, and other providers later without rewrites
- Fail safely when AI is disabled
- Never pretend mock output is real model inference

## Core abstraction

```ts
interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
}
```

Location: `src/server/ai`

## Current behavior

| Setting | Behavior |
| --- | --- |
| `AI_ENABLED=false` (default) | `completeAI()` throws `AI_DISABLED` |
| `AI_PROVIDER=mock` | `MockAIProvider` returns clearly labeled mock text with `isMock: true` |
| `anthropic` / `openai` | Not implemented yet; falls back to mock with a warning log |

## Mock contract

`MockAIProvider`:

- Does not call external networks
- Does not invent confidence or tool-use results
- Labels responses as mock
- Sets `isMock: true`

## Adding a real provider later

1. Implement `AIProvider` for the vendor.
2. Map env credentials in `src/config/env.ts`.
3. Register the provider in `getAIProvider()`.
4. Keep feature code calling `completeAI()` (or an equivalent service), not the SDK directly.
5. Continue logging provider name and message counts — never prompt secrets or API keys.

## Security notes

- AI keys are server-only
- Prompts may contain customer data later; treat logs carefully
- When AI product surfaces ship, authorization must check session permissions on the server (UI gating alone is insufficient)
