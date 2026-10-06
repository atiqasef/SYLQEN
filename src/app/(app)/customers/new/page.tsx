import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/features/customers/customer-form";
import { requireVerifiedPageSession } from "@/server/auth/session";

export default async function NewCustomerPage() {
  const session = await requireVerifiedPageSession();
  const canCreate = session.membership.permissions.includes("customers.create");

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-2" aria-labelledby="new-customer-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="new-customer-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          >
            Add customer
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Create a customer record in{" "}
          <span className="font-medium text-foreground">
            {session.workspace.name}
          </span>
          .
        </p>
      </section>

      {!canCreate ? (
        <div className="space-y-4">
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/70 px-3 py-2.5 text-sm text-muted-foreground"
          >
            You do not have permission to create customers
            {session.user.isDemo
              ? ". Demo accounts are read-only."
              : "."}
          </p>
          <Button asChild variant="outline">
            <Link href="/customers">Back to customers</Link>
          </Button>
        </div>
      ) : (
        <CustomerForm mode="create" cancelHref="/customers" />
      )}
    </div>
  );
}
