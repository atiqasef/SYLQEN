import { describe, expect, it } from "vitest";

import { MockAIProvider } from "@/server/ai/mock-provider";

describe("MockAIProvider", () => {
  it("returns clearly labeled mock output", async () => {
    const provider = new MockAIProvider();
    const response = await provider.complete({
      messages: [{ role: "user", content: "Summarize my pipeline" }],
    });

    expect(response.isMock).toBe(true);
    expect(response.provider).toBe("mock");
    expect(response.content).toMatch(/Mock AI/i);
    expect(response.content).not.toMatch(/as an AI language model/i);
  });
});
