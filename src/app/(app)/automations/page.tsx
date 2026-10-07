import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { BoltIcon, PlusIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutomationsTable } from "@/features/automations/automations-table";
import { AUTOMATION_TRIGGER_LABELS } from "@/features/automations/schemas";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import {
  listAutomationsForSession,
  listRecentAutomationActivityForSession,
} from "@/server/automations/service";

type AutomationsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AutomationsPage({
  searchParams,
}: AutomationsPageProps) {
  const session = await requireVerifiedPageSession();
  const params = await searchParams;
  const q = firstParam(params.q);
  const page = firstParam(params.page);

  const canCreate = session.membership.permissions.includes(
    "automations.create",
  );

  let list;
  let activity;
  try {
    [list, activity] = await Promise.all([
      listAutomationsForSession(session, { q, page }),
      listRecentAutomationActivityForSession(session),
    ]);
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <AutomationsPageHeader
          canCreate={canCreate}
          isDemo={session.user.isDemo}
        />
        <ErrorState
          title="Unable to load automations"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading automations."
          }
        />
      </div>
    );
  }

  const isEmpty = list.total === 0 && !q;

  return (
    <div className="space-y-6 sm:space-y-8">
      <AutomationsPageHeader
        canCreate={canCreate}
        isDemo={session.user.isDemo}
      />

      {isEmpty ? (
        <EmptyState
          icon={<BoltIcon className="size-8" />}
          title="No automations yet"
          description="Create a rule that reacts to overdue invoices, payments, new customers, or project status changes."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/automations/new">
                  <PlusIcon aria-hidden="true" />
                  Create automation
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo accounts are read-only and cannot create automations.
              </p>
            )
          }
        />
      ) : (
        <AutomationsTable items={list.items} />
      )}

      {activity.notifications.length > 0 ? (
        <section
          className="space-y-3"
          aria-labelledby="automation-notifications-heading"
        >
          <h3
            id="automation-notifications-heading"
            className="text-sm font-semibold text-foreground"
          >
            Recent automation notifications
          </h3>
          <ul className="divide-y divide-border rounded-[var(--radius-lg)] border border-border">
            {activity.notifications.map((item) => (
              <li key={item.id} className="space-y-1 px-3 py-3 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <Badge variant="secondary">
                    {AUTOMATION_TRIGGER_LABELS[item.triggerType]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  From {item.automationNameSnapshot}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AutomationsPageHeader({
  canCreate,
  isDemo,
}: {
  canCreate: boolean;
  isDemo: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="automations-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="automations-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
            >
              Automations
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            Reduce repetitive operational work with declarative, workspace-scoped
            rules.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/automations/new">
              <PlusIcon aria-hidden="true" />
              Create automation
            </Link>
          </Button>
        ) : null}
      </div>
      {isDemo ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view automations and execution history, but cannot
          create or change rules.
        </p>
      ) : null}
    </section>
  );
}
