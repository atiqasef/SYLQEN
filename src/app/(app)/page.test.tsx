import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OverviewPage from "@/app/(app)/page";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("OverviewPage", () => {
  it("renders the foundation overview", () => {
    render(
      <TooltipProvider>
        <OverviewPage />
      </TooltipProvider>,
    );

    expect(
      screen.getByRole("heading", { name: /SYLQEN foundation is ready/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No business modules yet/i)).toBeInTheDocument();
  });
});
