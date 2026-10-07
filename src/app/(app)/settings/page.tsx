import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { AccountSettingsForm } from "@/features/settings/account-settings-form";
import { ThemePreference } from "@/features/settings/theme-preference";
import { WorkspaceSettingsForm } from "@/features/settings/workspace-settings-form";
import { requireVerifiedPageSession } from "@/server/auth/session";

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
      aria-labelledby={id}
    >
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <h3
          id={id}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const session = await requireVerifiedPageSession();

  const canUpdateWorkspace =
    session.membership.permissions.includes("workspace.update");
  const canEditAccount = !session.user.isDemo;
  const isDemo = session.user.isDemo;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="settings-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="settings-heading"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
              >
                Settings
              </h2>
              {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
            </div>
            <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
              Manage workspace details and your account for{" "}
              <span className="font-medium text-foreground">
                {session.workspace.name}
              </span>
              .
            </p>
          </div>
        </div>
        {isDemo ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
          >
            Demo accounts can review settings, but cannot change workspace or
            account information. Theme preference still works on this device.
          </p>
        ) : null}
      </section>

      <div className="mx-auto max-w-2xl space-y-5">
        <SettingsSection
          id="workspace-settings-heading"
          title="Workspace"
          description="Basic information for the active workspace."
        >
          <WorkspaceSettingsForm
            initialName={session.workspace.name}
            slug={session.workspace.slug}
            readOnly={!canUpdateWorkspace}
            readOnlyMessage={
              isDemo
                ? "Demo accounts are read-only. Workspace settings cannot be changed."
                : "You can view workspace details, but only owners can rename the workspace."
            }
          />
        </SettingsSection>

        <SettingsSection
          id="account-settings-heading"
          title="Account"
          description="Your signed-in identity. Email stays managed by authentication."
        >
          <AccountSettingsForm
            initialName={session.user.name}
            email={session.user.email}
            readOnly={!canEditAccount}
            readOnlyMessage={
              isDemo
                ? "Demo accounts are read-only. Account settings cannot be changed."
                : undefined
            }
          />
        </SettingsSection>

        <SettingsSection
          id="preferences-settings-heading"
          title="Preferences"
          description="Appearance preferences for this browser."
        >
          <ThemePreference />
        </SettingsSection>

        <SettingsSection
          id="security-settings-heading"
          title="Security & access"
          description="Current account and workspace access details from your session."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Workspace role
              </dt>
              <dd className="text-sm text-foreground">
                {roleLabel(session.membership.role)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account type
              </dt>
              <dd className="text-sm text-foreground">
                {isDemo ? "Demo (read-only)" : "Standard"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email verification
              </dt>
              <dd className="text-sm text-foreground">
                {session.user.emailVerified ? "Verified" : "Not verified"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Workspace ID
              </dt>
              <dd className="truncate font-mono text-xs text-foreground sm:text-sm">
                {session.workspace.slug}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Access is enforced on the server from your authenticated session.
            UI visibility alone is never the security boundary.
          </p>
        </SettingsSection>
      </div>
    </div>
  );
}
