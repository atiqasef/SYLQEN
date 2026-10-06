import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4", false && "hidden", "text-sm")).toBe(
      "py-1 px-4 text-sm",
    );
  });
});
