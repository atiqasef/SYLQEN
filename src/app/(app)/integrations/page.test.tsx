import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import IntegrationsPage from "@/app/(app)/integrations/page";
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
      permissions: ["workspace.read"],
    },
  })),
}));

vi.mock("@/server/integrations/service", () => ({
  getIntegrationsSnapshotForSession: vi.fn(() => ({
    items: [
      {
        key: "stripe",
        slug: "stripe",
        name: "Stripe",
        category: "Payments",
        shortDescription: "Reserved payment infrastructure.",
        description: "Stripe reserved.",
        capabilities: ["Manual payment recording remains the live path today"],
        availability: "reserved",
        statusLabel: "Reserved · credentials not set",
        requiresConfiguration: true,
        supportsWorkspaceConnection: false,
        configurationSource: "environment",
        configurationSummary: "Stripe slots available.",
        securityNote: "Secrets stay on the server.",
        planned: false,
      },
      {
        key: "resend",
        slug: "resend",
        name: "Resend",
        category: "Email",
        shortDescription: "Transactional email.",
        description: "Email infrastructure.",
        capabilities: ["Transactional email"],
        availability: "not_configured",
        statusLabel: "Dev capture · Resend not configured",
        requiresConfiguration: true,
        supportsWorkspaceConnection: false,
        configurationSource: "environment",
        configurationSummary: "Dev capture active.",
        securityNote: "Credentials never in the browser.",
        planned: false,
      },
      {
        key: "ai",
        slug: "ai",
        name: "AI Assistant",
        category: "AI",
        shortDescription: "Provider abstraction.",
        description: "Mock AI provider.",
        capabilities: ["Mock provider"],
        availability: "active",
        statusLabel: "Abstraction ready · AI disabled",
        requiresConfiguration: false,
        supportsWorkspaceConnection: false,
        configurationSource: "provider_abstraction",
        configurationSummary: "AI_ENABLED is off.",
        securityNote: "No AI keys in the client.",
        planned: false,
      },
      {
        key: "slack",
        slug: "slack",
        name: "Slack",
        category: "Communication",
        shortDescription: "Planned notifications.",
        description: "Planned.",
        capabilities: ["Workspace notifications (planned)"],
        availability: "planned",
        statusLabel: "Planned",
        requiresConfiguration: true,
        supportsWorkspaceConnection: false,
        configurationSource: "none",
        configurationSummary: "Not available yet.",
        securityNote: "Cannot be connected.",
        planned: true,
      },
    ],
  })),
}));

describe("IntegrationsPage", () => {
  it("renders platform and planned integration sections", async () => {
    const ui = await IntegrationsPage();
    render(<TooltipProvider>{ui}</TooltipProvider>);

    expect(
      screen.getByRole("heading", { name: "Integrations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Platform integrations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Planned$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.getByText("Resend")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getAllByText(/Not available yet/i).length).toBeGreaterThan(0);
  });
});
