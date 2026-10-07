import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { BoltIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";

export default function AutomationNotFound() {
  return (
    <EmptyState
      icon={<BoltIcon className="size-8" />}
      title="Automation not found"
      description="This automation does not exist in your workspace, or you do not have access."
      action={
        <Button asChild variant="outline">
          <Link href="/automations">Back to automations</Link>
        </Button>
      }
    />
  );
}
