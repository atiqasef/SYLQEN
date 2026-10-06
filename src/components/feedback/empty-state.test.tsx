import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/feedback/empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="No records"
        description="Create your first record to get started."
      />,
    );

    expect(screen.getByText("No records")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first record to get started."),
    ).toBeInTheDocument();
  });
});
