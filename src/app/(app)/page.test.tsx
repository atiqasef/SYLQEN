import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewPage from "@/app/(app)/page";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/server/auth/session", () => ({
  requireVerifiedPageSession: vi.fn(async () => ({
    user: {
      id: "user_1",
      email: "owner@example.com",
      name: "Owner Example",
      emailVerified: true,
      isDemo: false,
    },
    workspace: {
      id: "ws_1",
      name: "Example Workspace",
      slug: "example-workspace",
    },
    membership: {
      id: "mem_1",
      workspaceId: "ws_1",
      userId: "user_1",
      role: "owner",
      permissions: ["workspace.read", "workspace.update"],
    },
  })),
}));

describe("OverviewPage", () => {
  it("renders the authenticated workspace overview", async () => {
    const ui = await OverviewPage();
    render(<TooltipProvider>{ui}</TooltipProvider>);

    expect(
      screen.getByRole("heading", { name: /Welcome, Owner Example/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Example Workspace/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /Workspace foundation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/More modules coming/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open Customers/i }),
    ).toHaveAttribute("href", "/customers");
    expect(screen.getAllByText("Standard").length).toBeGreaterThan(0);
  });
});
