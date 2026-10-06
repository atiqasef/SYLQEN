import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getCustomerForSession } from "@/server/customers/service";
import { cn } from "@/lib/utils/cn";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function DetailValue({
  value,
  empty = "Not provided",
  multiline = false,
}: {
  value?: string | null;
  empty?: string;
  multiline?: boolean;
}) {
  if (!value) {
    return <span className="font-normal text-muted-foreground/80">{empty}</span>;
  }

  return (
    <span
      className={cn(
        "font-medium text-foreground",
        multiline && "whitespace-pre-wrap break-words",
      )}
    >
      {value}
    </span>
  );
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const session = await requireVerifiedPageSession();
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

  const metaItems = [
    { label: "Email", value: customer.email },
    { label: "Phone", value: customer.phone },
    { label: "Company", value: customer.company },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-4" aria-labelledby="customer-detail-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/customers"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Customers
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-medium text-foreground">{customer.name}</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted text-sm font-semibold tracking-wide text-foreground sm:size-14 sm:text-base"
              aria-hidden="true"
            >
              {initials(customer.name)}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="customer-detail-heading"
                  className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
                >
                  {customer.name}
                </h2>
                {session.user.isDemo ? (
                  <Badge variant="warning">Demo read-only</Badge>
                ) : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {customer.email}
              </p>
              <ul className="flex flex-wrap gap-2 pt-0.5">
                {metaItems.map((item) =>
                  item.value ? (
                    <li key={item.label}>
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {item.label}
                        </span>
                        <span className="truncate">{item.value}</span>
                      </span>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button asChild variant="outline">
              <Link href="/customers">Back to list</Link>
            </Button>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {session.user.isDemo && !canUpdate ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
          >
            Demo accounts can view customer details, but cannot edit them.
          </p>
        ) : null}
      </section>

      <div className="mx-auto grid max-w-3xl gap-4">
        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="customer-contact-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="customer-contact-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Contact
            </h3>
          </div>
          <dl className="divide-y divide-border">
            {[
              { label: "Email", value: customer.email },
              { label: "Phone", value: customer.phone },
              { label: "Company", value: customer.company },
              {
                label: "Address",
                value: customer.address,
                multiline: true,
              },
            ].map((field) => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
              >
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-sm">
                  <DetailValue
                    value={field.value}
                    multiline={"multiline" in field && field.multiline}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="customer-notes-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="customer-notes-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Notes
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <p className="text-sm leading-6">
              <DetailValue value={customer.notes} multiline empty="No notes yet" />
            </p>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="customer-record-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="customer-record-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Record
            </h3>
          </div>
          <dl className="divide-y divide-border">
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDate(customer.createdAt)}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Updated</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDate(customer.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
