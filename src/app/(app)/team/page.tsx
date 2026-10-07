import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { TeamIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { MembersTable } from "@/features/members/members-table";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listMembersForSession } from "@/server/members/service";

export default async function TeamPage() {
  const session = await requireVerifiedPageSession();

  const canUpdate = session.membership.permissions.includes("members.update");
  const canRemove = session.membership.permissions.includes("members.remove");
  const canManage = canUpdate || canRemove;

  let list;
  try {
    list = await listMembersForSession(session);
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <TeamPageHeader
          workspaceName={session.workspace.name}
          isDemo={session.user.isDemo}
          canManage={canManage}
        />
        <ErrorState
          title="Unable to load team"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading team members. Please try again."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <TeamPageHeader
        workspaceName={session.workspace.name}
        isDemo={session.user.isDemo}
        canManage={canManage}
      />

      {list.total === 0 ? (
        <EmptyState
          icon={<TeamIcon className="size-8" />}
          title="No team members"
          description="This workspace does not have any membership records yet. Membership is created when a workspace is set up."
        />
      ) : (
        <section
          className="space-y-4"
          aria-labelledby="team-results-heading"
        >
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h3
                  id="team-results-heading"
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  Workspace members
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">
                    {list.total}
                  </span>{" "}
                  {list.total === 1 ? "member" : "members"}
                  <span className="text-muted-foreground/80">
                    {" "}
                    ·{" "}
                    <span className="tabular-nums">{list.ownerCount}</span>{" "}
                    {list.ownerCount === 1 ? "owner" : "owners"}
                  </span>
                </p>
              </div>
            </div>
            <div className="sm:px-1">
              <MembersTable
                members={list.items}
                ownerCount={list.ownerCount}
                canUpdate={canUpdate}
                canRemove={canRemove}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TeamPageHeader({
  workspaceName,
  isDemo,
  canManage,
}: {
  workspaceName: string;
  isDemo: boolean;
  canManage: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="team-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="team-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
            >
              Team
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            People with access to{" "}
            <span className="font-medium text-foreground">{workspaceName}</span>
            . Roles control what each person can view or change.
          </p>
        </div>
      </div>
      {isDemo && !canManage ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view the team and roles, but cannot change membership
          or remove members.
        </p>
      ) : null}
    </section>
  );
}
