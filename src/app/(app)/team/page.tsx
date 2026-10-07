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

  let list;
  try {
    list = await listMembersForSession(session);
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <TeamPageHeader isDemo={session.user.isDemo} />
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
      <TeamPageHeader isDemo={session.user.isDemo} />

      {list.total === 0 ? (
        <EmptyState
          icon={<TeamIcon className="size-8" />}
          title="No team members"
          description="Workspace membership could not be loaded for this account."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {list.total} {list.total === 1 ? "member" : "members"} ·{" "}
            {list.ownerCount} {list.ownerCount === 1 ? "owner" : "owners"}
          </p>
          <MembersTable
            members={list.items}
            ownerCount={list.ownerCount}
            canUpdate={canUpdate}
            canRemove={canRemove}
          />
        </>
      )}
    </div>
  );
}

function TeamPageHeader({ isDemo }: { isDemo: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Team</Badge>
          {isDemo ? <Badge variant="warning">Demo account</Badge> : null}
        </div>
        <div className="max-w-2xl space-y-1.5">
          <h2
            id="team-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Workspace members
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Manage who can access this workspace and which role they hold.
            {isDemo
              ? " Demo accounts can view the team but cannot change membership."
              : " Owners can update roles and remove members."}
          </p>
        </div>
      </div>
    </div>
  );
}
