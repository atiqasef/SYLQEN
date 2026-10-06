import "server-only";

import { AppError } from "@/lib/errors/app-error";

import type { AICompletionRequest, AICompletionResponse, AIProvider } from "./types";

/**
 * Development-safe mock. Never pretends that real AI processing occurred.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!request.messages.length) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "AI completion requires at least one message",
        userMessage: "A message is required to generate a response.",
      });
    }

    return {
      content:
        "[Mock AI] No real model was invoked. Enable a configured provider in a later phase when AI_ENABLED=true and credentials are available.",
      provider: this.name,
      model: "mock-v1",
      isMock: true,
    };
  }
}
