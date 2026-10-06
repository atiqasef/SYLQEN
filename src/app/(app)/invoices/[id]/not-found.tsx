import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export default function InvoiceNotFound() {
  return (
    <EmptyState
      title="Invoice not found"
      description="This invoice does not exist in your workspace, or the link is invalid."
      action={
        <Button asChild variant="outline">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      }
    />
  );
}
