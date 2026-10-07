import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { IntegrationCard } from "@/features/integrations/integration-card";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getIntegrationsSnapshotForSession } from "@/server/integrations/service";

export default async function IntegrationsPage() {
  const session = await requireVerifiedPageSession();

  let snapshot;
  try {
    snapshot = getIntegrationsSnapshotForSession(session);
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <IntegrationsPageHeader
          workspaceName={session.workspace.name}
          isDemo={session.user.isDemo}
        />
        <ErrorState
          title="Unable to load integrations"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading integrations. Please try again."
          }
        />
      </div>
    );
  }

  const available = snapshot.items.filter((item) => !item.planned);
  const planned = snapshot.items.filter((item) => item.planned);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="integrations-heading">
        <IntegrationsPageHeader
          workspaceName={session.workspace.name}
          isDemo={session.user.isDemo}
        />
      </section>

      <section className="space-y-3" aria-labelledby="integrations-available-heading">
        <h3
          id="integrations-available-heading"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Platform integrations
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {available.map((item) => (
            <IntegrationCard key={item.key} item={item} />
          ))}
        </div>
      </section>

      {planned.length > 0 ? (
        <section className="space-y-3" aria-labelledby="integrations-planned-heading">
          <div className="space-y-1">
            <h3
              id="integrations-planned-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Planned
            </h3>
            <p className="text-sm text-muted-foreground">
              Shown for roadmap visibility only — no connect flows or backends.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {planned.map((item) => (
              <IntegrationCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function IntegrationsPageHeader({
  workspaceName,
  isDemo,
}: {
  workspaceName: string;
  isDemo: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="integrations-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
        >
          Integrations
        </h2>
        {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
        Connect SYLQEN with external services for{" "}
        <span className="font-medium text-foreground">{workspaceName}</span>.
        Status reflects platform configuration — secrets stay on the server.
      </p>
      {isDemo ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view Integrations, but cannot change platform
          configuration or connect providers.
        </p>
      ) : null}
    </div>
  );
}
