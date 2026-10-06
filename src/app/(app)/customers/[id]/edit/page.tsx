import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/features/customers/customer-form";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getCustomerForSession } from "@/server/customers/service";
import { connectMongo } from "@/server/db/mongodb";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps) {
  const session = await requireVerifiedPageSession();
  await connectMongo();
  const { id } = await params;

  const canUpdate = session.membership.permissions.includes("customers.update");

  let customer;
  try {
    customer = await getCustomerForSession(session, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    const appError = toAppError(error);
    return (
      <ErrorState
        title="Unable to load customer"
        description={appError.userMessage}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-2" aria-labelledby="edit-customer-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="edit-customer-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
          >
            Edit customer
          </h2>
          {session.user.isDemo ? (
            <Badge variant="warning">Demo read-only</Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Updating{" "}
          <span className="font-medium text-foreground">{customer.name}</span>
        </p>
      </section>

      {!canUpdate ? (
        <div className="space-y-4">
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/70 px-3 py-2.5 text-sm text-muted-foreground"
          >
            You do not have permission to edit customers
            {session.user.isDemo
              ? ". Demo accounts are read-only."
              : "."}
          </p>
          <Button asChild variant="outline">
            <Link href={`/customers/${customer.id}`}>Back to customer</Link>
          </Button>
        </div>
      ) : (
        <CustomerForm
          mode="edit"
          customerId={customer.id}
          cancelHref={`/customers/${customer.id}`}
          initialValues={{
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company,
            address: customer.address,
            notes: customer.notes,
          }}
        />
      )}
    </div>
  );
}
