import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getCustomerForSession } from "@/server/customers/service";
import { connectMongo } from "@/server/db/mongodb";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
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

  const fields = [
    { label: "Email", value: customer.email },
    { label: "Phone", value: customer.phone },
    { label: "Company", value: customer.company },
    { label: "Address", value: customer.address },
    { label: "Notes", value: customer.notes },
    { label: "Created", value: formatDate(customer.createdAt) },
    { label: "Updated", value: formatDate(customer.updatedAt) },
  ] as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section
        className="flex flex-wrap items-start justify-between gap-3"
        aria-labelledby="customer-detail-heading"
      >
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="customer-detail-heading"
              className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
            >
              {customer.name}
            </h2>
            {session.user.isDemo ? (
              <Badge variant="warning">Demo read-only</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/customers">Back to list</Link>
          </Button>
          {canUpdate ? (
            <Button asChild>
              <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <dl className="mx-auto max-w-2xl divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        {fields.map((field) => (
          <div
            key={field.label}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
          >
            <dt className="text-sm text-muted-foreground">{field.label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium text-foreground">
              {field.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
