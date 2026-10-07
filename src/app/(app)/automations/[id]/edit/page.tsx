import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutomationForm } from "@/features/automations/automation-form";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getAutomationForSession } from "@/server/automations/service";

type EditAutomationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAutomationPage({
  params,
}: EditAutomationPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes(
    "automations.update",
  );

  let automation;
  try {
    automation = await getAutomationForSession(session, id);
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
      <section className="space-y-2" aria-labelledby="edit-automation-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="edit-automation-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Edit automation
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{automation.name}</p>
      </section>

      {!canUpdate ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You do not have permission to edit automations.
          </p>
          <Button asChild variant="outline">
            <Link href={`/automations/${automation.id}`}>Back</Link>
          </Button>
        </div>
      ) : (
        <AutomationForm
          mode="edit"
          automationId={automation.id}
          cancelHref={`/automations/${automation.id}`}
          readOnly={session.user.isDemo}
          readOnlyMessage="Demo accounts cannot update automations."
          initialValues={{
            name: automation.name,
            description: automation.description,
            enabled: automation.enabled,
            trigger: automation.trigger,
            conditions: automation.conditions,
            actions: automation.actions,
          }}
        />
      )}
    </div>
  );
}
