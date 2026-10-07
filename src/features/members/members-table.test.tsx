import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MembersTable } from "@/features/members/members-table";
import type { MemberDTO } from "@/server/members/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/server/members/actions", () => ({
  updateMemberRoleAction: vi.fn(),
  removeMemberAction: vi.fn(),
}));

const baseMembers: MemberDTO[] = [
  {
    id: "507f1f77bcf86cd799439011",
    userId: "user_owner",
    name: "Owner Example",
    email: "owner@example.test",
    role: "owner",
    joinedAt: "2026-01-01T00:00:00.000Z",
    isCurrentUser: true,
  },
  {
    id: "507f1f77bcf86cd799439012",
    userId: "user_member",
    name: "Member Example",
    email: "member@example.test",
    role: "member",
    joinedAt: "2026-02-01T00:00:00.000Z",
    isCurrentUser: false,
  },
];

describe("MembersTable", () => {
  it("renders identity, role badges, and current-user indicator for read-only users", () => {
    render(
      <MembersTable
        members={baseMembers}
        ownerCount={1}
        canUpdate={false}
        canRemove={false}
      />,
    );

    expect(screen.getAllByText("Owner Example").length).toBeGreaterThan(0);
    expect(screen.getAllByText("owner@example.test").length).toBeGreaterThan(0);
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Member").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Remove/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows owner controls and final-owner protection", () => {
    render(
      <MembersTable
        members={baseMembers}
        ownerCount={1}
        canUpdate
        canRemove
      />,
    );

    expect(
      screen.getAllByText(/Final owner cannot be demoted/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Final owner").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", {
        name: /Remove Member Example from workspace/i,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText(/Role for Member Example/i).length,
    ).toBeGreaterThan(0);
  });
});
