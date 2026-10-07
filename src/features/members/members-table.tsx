"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils/cn";
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

function displayName(member: MemberDTO) {
  if (member.name && member.name !== "Unknown member") {
    return member.name;
  }
  return member.email || "Unknown member";
}

function initials(name: string, email: string) {
  const source = name && name !== "Unknown member" ? name : email;
  const fromName = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) {
    return fromName;
  }
  return (email[0] ?? "?").toUpperCase();
}

function roleLabel(role: MemberDTO["role"]) {
  if (role === "admin") {
    return MEMBER_ROLE_LABELS.admin;
  }
  return MEMBER_ROLE_LABELS[role as ManageableMemberRole];
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
  const showActions = canUpdate || canRemove;

  async function handleRoleChange(member: MemberDTO, role: string) {
    if (!canUpdate || role === member.role || pendingId) {
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
    if (!removeTarget || !canRemove || pendingId) {
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
      <div aria-live="polite" className="sr-only">
        {pendingId ? "Saving team member changes" : ""}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="hidden md:block">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Workspace team members</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase sm:px-5"
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
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Joined
              </th>
              {showActions ? (
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase sm:px-5"
                >
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isLastOwner = member.role === "owner" && ownerCount <= 1;
              const busy = pendingId === member.id;
              const name = displayName(member);

              return (
                <tr
                  key={member.id}
                  className={cn(
                    "border-b border-border last:border-0 transition-ui hover:bg-muted/45",
                    busy && "opacity-70",
                  )}
                  aria-busy={busy || undefined}
                >
                  <th scope="row" className="px-4 py-4 font-normal sm:px-5">
                    <MemberIdentity
                      name={name}
                      email={member.email}
                      isCurrentUser={member.isCurrentUser}
                    />
                  </th>
                  <td className="px-4 py-4 align-middle">
                    <RoleCell
                      member={member}
                      canUpdate={canUpdate}
                      isLastOwner={isLastOwner}
                      busy={busy}
                      onRoleChange={handleRoleChange}
                    />
                  </td>
                  <td className="hidden px-4 py-4 align-middle text-xs tabular-nums text-muted-foreground lg:table-cell">
                    {formatJoined(member.joinedAt)}
                  </td>
                  {showActions ? (
                    <td className="px-4 py-4 text-right align-middle sm:px-5">
                      {canRemove && !isLastOwner ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          aria-label={`Remove ${name} from workspace`}
                          onClick={() => setRemoveTarget(member)}
                        >
                          Remove
                        </Button>
                      ) : canRemove && isLastOwner ? (
                        <span className="text-xs text-muted-foreground">
                          Final owner
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label="Workspace team members">
        {members.map((member) => {
          const isLastOwner = member.role === "owner" && ownerCount <= 1;
          const busy = pendingId === member.id;
          const name = displayName(member);

          return (
            <li
              key={member.id}
              className={cn(
                "space-y-3 px-4 py-4 transition-ui hover:bg-muted/35",
                busy && "opacity-70",
              )}
              aria-busy={busy || undefined}
            >
              <MemberIdentity
                name={name}
                email={member.email}
                isCurrentUser={member.isCurrentUser}
              />
              <div className="flex flex-wrap items-center gap-2">
                <RoleCell
                  member={member}
                  canUpdate={canUpdate}
                  isLastOwner={isLastOwner}
                  busy={busy}
                  onRoleChange={handleRoleChange}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  Joined {formatJoined(member.joinedAt)}
                </span>
              </div>
              {canRemove && !isLastOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={`Remove ${name} from workspace`}
                  onClick={() => setRemoveTarget(member)}
                >
                  Remove
                </Button>
              ) : null}
              {canRemove && isLastOwner ? (
                <p className="text-xs text-muted-foreground">
                  This is the final owner and cannot be removed.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open && pendingId !== removeTarget?.id) {
            setRemoveTarget(null);
          }
        }}
      >
        <DialogContent aria-describedby="remove-member-description">
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription id="remove-member-description">
              {removeTarget
                ? `Remove ${displayName(removeTarget)}${
                    removeTarget.email ? ` (${removeTarget.email})` : ""
                  } from this workspace? They will lose access to workspace data immediately.`
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

function MemberIdentity({
  name,
  email,
  isCurrentUser,
}: {
  name: string;
  email: string;
  isCurrentUser: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
        aria-hidden="true"
      >
        {initials(name, email)}
      </span>
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">{name}</span>
          {isCurrentUser ? (
            <Badge
              variant="outline"
              className="rounded-[var(--radius-sm)] px-1.5 py-0 text-[11px] font-medium"
            >
              You
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          {email || "No email on file"}
        </p>
      </div>
    </div>
  );
}

function RoleCell({
  member,
  canUpdate,
  isLastOwner,
  busy,
  onRoleChange,
}: {
  member: MemberDTO;
  canUpdate: boolean;
  isLastOwner: boolean;
  busy: boolean;
  onRoleChange: (member: MemberDTO, role: string) => void;
}) {
  const badgeRole =
    member.role === "admin"
      ? "admin"
      : (member.role as ManageableMemberRole);

  if (!canUpdate) {
    return <MemberRoleBadge role={badgeRole} />;
  }

  if (isLastOwner) {
    return (
      <div className="space-y-1">
        <MemberRoleBadge role={badgeRole} />
        <p className="max-w-[11rem] text-[11px] leading-4 text-muted-foreground">
          Final owner cannot be demoted
        </p>
      </div>
    );
  }

  return (
    <label className="block min-w-[8.5rem] max-w-[11rem]">
      <span className="sr-only">Role for {displayName(member)}</span>
      <select
        className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-background px-2 text-sm text-foreground transition-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        value={member.role}
        disabled={busy}
        aria-label={`Role for ${displayName(member)}: ${roleLabel(member.role)}`}
        onChange={(event) => {
          void onRoleChange(member, event.target.value);
        }}
      >
        {member.role === "admin" ? (
          <option value="admin" disabled>
            {MEMBER_ROLE_LABELS.admin}
          </option>
        ) : null}
        {MANAGEABLE_MEMBER_ROLES.map((role) => (
          <option key={role} value={role}>
            {MEMBER_ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </label>
  );
}
