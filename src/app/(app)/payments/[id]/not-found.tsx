import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { FinanceIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";

export default function PaymentNotFound() {
  return (
    <EmptyState
      icon={<FinanceIcon className="size-8" />}
      title="Payment not found"
      description="This payment does not exist in your workspace, or the link is invalid."
      action={
        <Button asChild variant="outline">
          <Link href="/payments">Back to payments</Link>
        </Button>
      }
    />
  );
}
