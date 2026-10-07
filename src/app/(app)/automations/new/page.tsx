import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutomationForm } from "@/features/automations/automation-form";
import { requireVerifiedPageSession } from "@/server/auth/session";

export default async function NewAutomationPage() {
  const session = await requireVerifiedPageSession();
  const canCreate = session.membership.permissions.includes(
    "automations.create",
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-2" aria-labelledby="new-automation-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="new-automation-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Create automation
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Define a trigger, optional conditions, and an internal notification
          action.
        </p>
      </section>

      {!canCreate ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You do not have permission to create automations.
          </p>
          <Button asChild variant="outline">
            <Link href="/automations">Back to automations</Link>
          </Button>
        </div>
      ) : (
        <AutomationForm
          mode="create"
          cancelHref="/automations"
          readOnly={session.user.isDemo}
          readOnlyMessage="Demo accounts cannot create automations."
        />
      )}
    </div>
  );
}
