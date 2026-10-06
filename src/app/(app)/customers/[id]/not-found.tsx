import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { UsersIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";

export default function CustomerNotFound() {
  return (
    <EmptyState
      icon={<UsersIcon className="size-8" />}
      title="Customer not found"
      description="This customer does not exist in your workspace, or the link is invalid."
      action={
        <Button asChild variant="outline">
          <Link href="/customers">Back to customers</Link>
        </Button>
      }
    />
  );
}
