import "server-only";

import { getServerEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/server/logging/logger";

import { MockAIProvider } from "./mock-provider";
import type { AICompletionRequest, AICompletionResponse, AIProvider } from "./types";

export type { AICompletionRequest, AICompletionResponse, AIMessage, AIProvider } from "./types";
export { MockAIProvider } from "./mock-provider";

/**
 * Resolve the active AI provider.
 * Until real providers are wired, only the mock implementation is available.
 */
export function getAIProvider(): AIProvider {
  const env = getServerEnv();

  if (!env.AI_ENABLED) {
    return new MockAIProvider();
  }

  switch (env.AI_PROVIDER) {
    case "mock":
      return new MockAIProvider();
    case "anthropic":
    case "openai":
      logger.warn("Configured AI provider is not implemented yet; using mock", {
        provider: env.AI_PROVIDER,
      });
      return new MockAIProvider();
    default:
      return new MockAIProvider();
  }
}

/**
 * High-level entry point for future features.
 * Enforces AI_ENABLED and never fabricates real-model output.
 */
export async function completeAI(
  request: AICompletionRequest,
): Promise<AICompletionResponse> {
  const env = getServerEnv();

  if (!env.AI_ENABLED) {
    throw new AppError({
      code: "AI_DISABLED",
      message: "AI is disabled by configuration",
      userMessage:
        "AI assistance is currently disabled. Set AI_ENABLED=true when a provider is ready.",
    });
  }

  const provider = getAIProvider();
  logger.info("AI completion requested", {
    provider: provider.name,
    messageCount: request.messages.length,
  });

  return provider.complete(request);
}
