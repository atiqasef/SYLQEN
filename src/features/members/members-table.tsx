"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberRoleBadge } from "@/features/members/member-role-badge";
import {
  MANAGEABLE_MEMBER_ROLES,
  MEMBER_ROLE_LABELS,
  type ManageableMemberRole,
} from "@/features/members/schemas";
import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/server/members/actions";
import type { MemberDTO } from "@/server/members/types";

type MembersTableProps = {
  members: MemberDTO[];
  ownerCount: number;
  canUpdate: boolean;
  canRemove: boolean;
};

function formatJoined(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function roleOptionsFor(member: MemberDTO): ManageableMemberRole[] {
  if (member.role === "admin") {
    return [...MANAGEABLE_MEMBER_ROLES];
  }
  return [...MANAGEABLE_MEMBER_ROLES];
}

export function MembersTable({
  members,
  ownerCount,
  canUpdate,
  canRemove,
}: MembersTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<MemberDTO | null>(
    null,
  );

  async function handleRoleChange(member: MemberDTO, role: string) {
    if (!canUpdate || role === member.role) {
      return;
    }

    setError(null);
    setPendingId(member.id);
    const result = await updateMemberRoleAction({
      membershipId: member.id,
      role,
    });
    setPendingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  async function confirmRemove() {
    if (!removeTarget || !canRemove) {
      return;
    }

    setError(null);
    setPendingId(removeTarget.id);
    const result = await removeMemberAction({
      membershipId: removeTarget.id,
    });
    setPendingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setRemoveTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="hidden md:block overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Workspace team members</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Member
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Joined
              </th>
              {(canUpdate || canRemove) && (
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isLastOwner =
                member.role === "owner" && ownerCount <= 1;
              const busy = pendingId === member.id;

              return (
                <tr
                  key={member.id}
                  className="border-b border-border last:border-0"
                >
                  <th scope="row" className="px-4 py-3.5 font-normal">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {member.name}
                        </span>
                        {member.isCurrentUser ? (
                          <span className="rounded-[var(--radius-sm)] border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            You
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">
                        {member.email || "No email on file"}
                      </p>
                    </div>
                  </th>
                  <td className="px-4 py-3.5">
                    {canUpdate ? (
                      <label className="block min-w-[8rem]">
                        <span className="sr-only">
                          Role for {member.name}
                        </span>
                        <select
                          className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                          value={member.role}
                          disabled={busy || isLastOwner}
                          aria-disabled={isLastOwner || undefined}
                          title={
                            isLastOwner
                              ? "The final owner cannot be demoted"
                              : undefined
                          }
                          onChange={(event) => {
                            void handleRoleChange(member, event.target.value);
                          }}
                        >
                          {member.role === "admin" ? (
                            <option value="admin" disabled>
                              {MEMBER_ROLE_LABELS.admin}
                            </option>
                          ) : null}
                          {roleOptionsFor(member).map((role) => (
                            <option key={role} value={role}>
                              {MEMBER_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <MemberRoleBadge
                        role={
                          member.role === "admin"
                            ? "admin"
                            : (member.role as ManageableMemberRole)
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                    {formatJoined(member.joinedAt)}
                  </td>
                  {(canUpdate || canRemove) && (
                    <td className="px-4 py-3.5 text-right">
                      {canRemove ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy || isLastOwner}
                          aria-label={`Remove ${member.name} from workspace`}
                          title={
                            isLastOwner
                              ? "The final owner cannot be removed"
                              : undefined
                          }
                          onClick={() => setRemoveTarget(member)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul
        className="divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-card shadow-panel md:hidden"
        aria-label="Workspace team members"
      >
        {members.map((member) => {
          const isLastOwner = member.role === "owner" && ownerCount <= 1;
          const busy = pendingId === member.id;

          return (
            <li key={member.id} className="space-y-3 px-4 py-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {member.name}
                  </span>
                  {member.isCurrentUser ? (
                    <span className="rounded-[var(--radius-sm)] border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      You
                    </span>
                  ) : null}
                  {!canUpdate ? (
                    <MemberRoleBadge
                      role={
                        member.role === "admin"
                          ? "admin"
                          : (member.role as ManageableMemberRole)
                      }
                    />
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {member.email || "No email on file"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  Joined {formatJoined(member.joinedAt)}
                </p>
              </div>

              {canUpdate || canRemove ? (
                <div className="flex flex-wrap items-center gap-2">
                  {canUpdate ? (
                    <label className="min-w-[8rem] flex-1">
                      <span className="sr-only">Role for {member.name}</span>
                      <select
                        className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        value={member.role}
                        disabled={busy || isLastOwner}
                        onChange={(event) => {
                          void handleRoleChange(member, event.target.value);
                        }}
                      >
                        {member.role === "admin" ? (
                          <option value="admin" disabled>
                            {MEMBER_ROLE_LABELS.admin}
                          </option>
                        ) : null}
                        {roleOptionsFor(member).map((role) => (
                          <option key={role} value={role}>
                            {MEMBER_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {canRemove ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || isLastOwner}
                      aria-label={`Remove ${member.name} from workspace`}
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `Remove ${removeTarget.name} (${removeTarget.email || "no email"}) from this workspace? They will lose access to workspace data.`
                : "Remove this member from the workspace?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={pendingId === removeTarget?.id}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void confirmRemove();
              }}
              disabled={pendingId === removeTarget?.id}
            >
              {pendingId === removeTarget?.id ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
