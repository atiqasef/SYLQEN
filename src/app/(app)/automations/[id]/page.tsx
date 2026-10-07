import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AUTOMATION_TRIGGER_LABELS,
} from "@/features/automations/schemas";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import {
  getAutomationForSession,
  listAutomationExecutionsForSession,
} from "@/server/automations/service";

type AutomationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AutomationDetailPage({
  params,
}: AutomationDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes(
    "automations.update",
  );

  let automation;
  let executions;
  try {
    automation = await getAutomationForSession(session, id);
    executions = await listAutomationExecutionsForSession(session, id, 20);
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <ErrorState
        title="Unable to load automation"
        description={
          isAppError(error)
            ? appError.userMessage
            : "Something went wrong while loading this automation."
        }
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-3" aria-labelledby="automation-detail-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="automation-detail-heading"
                className="text-2xl font-semibold tracking-tight text-foreground"
              >
                {automation.name}
              </h2>
              <Badge variant={automation.enabled ? "success" : "muted"}>
                {automation.enabled ? "Enabled" : "Disabled"}
              </Badge>
              {session.user.isDemo ? (
                <Badge variant="warning">Demo read-only</Badge>
              ) : null}
            </div>
            {automation.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {automation.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Button asChild>
                <Link href={`/automations/${automation.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/automations">Back</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Definition</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Trigger</dt>
              <dd className="text-foreground">
                {AUTOMATION_TRIGGER_LABELS[automation.trigger.type]}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Summary</dt>
              <dd className="text-foreground">{automation.summary}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Conditions</dt>
              <dd className="text-foreground">
                {automation.conditions.length === 0
                  ? "None"
                  : `${automation.conditions.length} (AND)`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actions</dt>
              <dd className="text-foreground">
                {automation.actions
                  .map((action) =>
                    action.type === "notification.create"
                      ? `Notification: ${action.title}`
                      : action.type,
                  )
                  .join("; ")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Recent executions
          </h3>
          {executions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No executions yet. Matching domain events will appear here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-[var(--radius-md)] border border-border">
              {executions.map((execution) => (
                <li key={execution.id} className="space-y-1 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={
                        execution.status === "success"
                          ? "success"
                          : execution.status === "failed"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {execution.status}
                    </Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(execution.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {execution.actionSummaries.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {execution.actionSummaries.join(" · ")}
                    </p>
                  ) : null}
                  {execution.errorMessage ? (
                    <p className="text-xs text-muted-foreground">
                      {execution.errorMessage}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
