/**
 * Provider-agnostic AI contracts.
 * Business logic should depend on these types, not on a vendor SDK.
 */

export type AIMessageRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: AIMessageRole;
  content: string;
};

export type AICompletionRequest = {
  messages: AIMessage[];
  /** Optional model hint; providers may ignore or map this. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AICompletionResponse = {
  content: string;
  provider: string;
  model: string;
  /** True only when a real provider produced the response. */
  isMock: boolean;
};

export interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
}
