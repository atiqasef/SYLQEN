import { describe, expect, it } from "vitest";

import {
  dateOnlyToUtcDate,
  projectInputSchema,
  projectListQuerySchema,
  utcDateToDateOnly,
} from "@/features/projects/schemas";
import { parseWithSchema } from "@/lib/validation/result";

describe("projectInputSchema", () => {
  it("accepts a valid project and trims fields", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: "  Website redesign  ",
      description: "  Delivery scope  ",
      status: "active",
      clientName: "  Acme  ",
      startDate: "2026-01-10",
      dueDate: "2026-02-01",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Website redesign");
      expect(result.data.description).toBe("Delivery scope");
      expect(result.data.clientName).toBe("Acme");
      expect(result.data.status).toBe("active");
      expect(result.data.startDate).toBe("2026-01-10");
      expect(result.data.dueDate).toBe("2026-02-01");
    }
  });

  it("rejects empty name", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: " ",
      status: "planning",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: "Project",
      status: "archived",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid dates", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: "Project",
      status: "planning",
      startDate: "2026-13-40",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects due date earlier than start date", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: "Project",
      status: "planning",
      startDate: "2026-03-01",
      dueDate: "2026-02-01",
    });
    expect(result.ok).toBe(false);
  });

  it("allows equal start and due dates", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: "Project",
      status: "planning",
      startDate: "2026-03-01",
      dueDate: "2026-03-01",
    });
    expect(result.ok).toBe(true);
  });

  it("clears empty optional strings", () => {
    const result = parseWithSchema(projectInputSchema, {
      name: "Project",
      status: "on_hold",
      description: "   ",
      clientName: "",
      startDate: "",
      dueDate: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.clientName).toBeUndefined();
      expect(result.data.startDate).toBeUndefined();
      expect(result.data.dueDate).toBeUndefined();
    }
  });
});

describe("project date helpers", () => {
  it("round-trips YYYY-MM-DD through UTC storage", () => {
    const stored = dateOnlyToUtcDate("2026-07-15");
    expect(utcDateToDateOnly(stored)).toBe("2026-07-15");
  });
});

describe("projectListQuerySchema", () => {
  it("applies defaults", () => {
    const result = parseWithSchema(projectListQuerySchema, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });
});
