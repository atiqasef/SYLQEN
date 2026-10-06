import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getInvoiceForSession } from "@/server/invoices/service";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateOnly(value: string) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year!, month! - 1, day!)));
  } catch {
    return value;
  }
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes("invoices.update");

  let invoice;
  try {
    invoice = await getInvoiceForSession(session, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    const appError = toAppError(error);
    return (
      <ErrorState
        title="Unable to load invoice"
        description={appError.userMessage}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-4" aria-labelledby="invoice-detail-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/invoices"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Invoices
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-mono font-medium text-foreground">
              {invoice.invoiceNumber}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="invoice-detail-heading"
                className="truncate font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
              >
                {invoice.invoiceNumber}
              </h2>
              <InvoiceStatusBadge status={invoice.status} />
              {session.user.isDemo ? (
                <Badge variant="warning">Demo read-only</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.customerNameSnapshot}
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatMoney(invoice.total, invoice.currency)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button asChild variant="outline">
              <Link href="/invoices">Back to list</Link>
            </Button>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {session.user.isDemo && !canUpdate ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
          >
            Demo accounts can view invoice details, but cannot edit them.
          </p>
        ) : null}
      </section>

      <div className="mx-auto grid max-w-3xl gap-4">
        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="invoice-summary-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="invoice-summary-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Summary
            </h3>
          </div>
          <dl className="divide-y divide-border">
            {[
              { label: "Customer", value: invoice.customerNameSnapshot },
              { label: "Issue date", value: formatDateOnly(invoice.issueDate) },
              { label: "Due date", value: formatDateOnly(invoice.dueDate) },
              { label: "Currency", value: invoice.currency },
            ].map((field) => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
              >
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-sm font-medium text-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="invoice-lines-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="invoice-lines-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Line items
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left text-sm">
              <caption className="sr-only">Invoice line items</caption>
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                  >
                    Product
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                  >
                    Qty
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                  >
                    Unit
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
                  >
                    Line
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr
                    key={`${item.productId}-${index}`}
                    className="border-b border-border last:border-0"
                  >
                    <th scope="row" className="px-4 py-3.5 font-normal">
                      <span className="block font-medium text-foreground">
                        {item.productNameSnapshot}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {item.skuSnapshot}
                      </span>
                    </th>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-foreground">
                      {formatMoney(item.lineTotal, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-1 border-t border-border px-4 py-4 text-sm sm:px-5">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-base font-semibold">
              <span className="text-foreground">Total</span>
              <span className="tabular-nums text-foreground">
                {formatMoney(invoice.total, invoice.currency)}
              </span>
            </div>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="invoice-notes-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="invoice-notes-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Notes
            </h3>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <p className="text-sm leading-6 whitespace-pre-wrap break-words text-foreground">
              {invoice.notes || (
                <span className="text-muted-foreground/80">No notes</span>
              )}
            </p>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="invoice-record-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="invoice-record-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Record
            </h3>
          </div>
          <dl className="divide-y divide-border">
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDateTime(invoice.createdAt)}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Updated</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDateTime(invoice.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
