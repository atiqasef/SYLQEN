import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INVOICE_STATUS_LABELS } from "@/features/invoices/schemas";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { getInvoiceForSession } from "@/server/invoices/service";
import { getInvoicePaymentSummaryForSession } from "@/server/payments/service";
import { cn } from "@/lib/utils/cn";

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

function invoiceMark(invoiceNumber: string) {
  const digits = invoiceNumber.replace(/\D/g, "");
  if (digits.length >= 2) {
    return digits.slice(-2);
  }
  return invoiceNumber.slice(0, 2).toUpperCase() || "IN";
}

function DetailValue({
  value,
  empty = "Not provided",
  multiline = false,
  mono = false,
}: {
  value?: string | null;
  empty?: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  if (!value) {
    return <span className="font-normal text-muted-foreground/80">{empty}</span>;
  }

  return (
    <span
      className={cn(
        "font-medium text-foreground",
        multiline && "whitespace-pre-wrap break-words",
        mono && "font-mono tracking-wide",
      )}
    >
      {value}
    </span>
  );
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;
  const canUpdate = session.membership.permissions.includes("invoices.update");
  const canCreatePayment =
    session.membership.permissions.includes("payments.create");

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

  let paymentSummary = null;
  try {
    paymentSummary = await getInvoicePaymentSummaryForSession(session, invoice.id);
  } catch {
    paymentSummary = null;
  }

  const formattedTotal = formatMoney(invoice.total, invoice.currency);
  const issueLabel = formatDateOnly(invoice.issueDate);
  const dueLabel = formatDateOnly(invoice.dueDate);
  const metaItems = [
    { label: "Status", value: INVOICE_STATUS_LABELS[invoice.status] },
    { label: "Customer", value: invoice.customerNameSnapshot },
    { label: "Issued", value: issueLabel },
    { label: "Due", value: dueLabel },
    { label: "Currency", value: invoice.currency },
  ];

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
            <li className="truncate font-mono font-medium tracking-wide text-foreground">
              {invoice.invoiceNumber}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted font-mono text-sm font-semibold tracking-wide text-foreground sm:size-14 sm:text-base"
              aria-hidden="true"
            >
              {invoiceMark(invoice.invoiceNumber)}
            </div>
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
              <p className="truncate text-sm font-medium text-foreground">
                {invoice.customerNameSnapshot}
              </p>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
                {formattedTotal}
                <span className="ml-1.5 text-sm font-normal tracking-wide text-muted-foreground uppercase">
                  {invoice.currency}
                </span>
              </p>
              <ul className="flex flex-wrap gap-2 pt-0.5">
                {metaItems.map((item) =>
                  item.value ? (
                    <li key={item.label}>
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "truncate",
                            (item.label === "Issued" || item.label === "Due") &&
                              "tabular-nums",
                            item.label === "Currency" &&
                              "font-mono tracking-wide uppercase",
                          )}
                        >
                          {item.value}
                        </span>
                      </span>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
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
              Invoice information
            </h3>
          </div>
          <dl className="divide-y divide-border">
            {[
              {
                label: "Customer",
                value: invoice.customerNameSnapshot,
              },
              { label: "Issue date", value: issueLabel },
              { label: "Due date", value: dueLabel },
              { label: "Currency", value: invoice.currency, mono: true },
              {
                label: "Status",
                value: INVOICE_STATUS_LABELS[invoice.status],
              },
            ].map((field) => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
              >
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-sm">
                  {field.label === "Status" ? (
                    <InvoiceStatusBadge status={invoice.status} />
                  ) : (
                    <DetailValue
                      value={field.value}
                      mono={"mono" in field && field.mono}
                    />
                  )}
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
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Product names, SKUs, and prices are snapshots from when the invoice
              was saved.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full min-w-0 border-collapse text-left text-sm">
              <caption className="sr-only">Invoice line items</caption>
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase sm:px-5"
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
                    Unit price
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase sm:px-5"
                  >
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr
                    key={`${item.productId}-${index}`}
                    className="border-b border-border last:border-0"
                  >
                    <th scope="row" className="px-4 py-3.5 font-normal sm:px-5">
                      <span className="block font-medium text-foreground">
                        {item.productNameSnapshot}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs tracking-wide text-muted-foreground">
                        {item.skuSnapshot}
                      </span>
                    </th>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-foreground sm:px-5">
                      {formatMoney(item.lineTotal, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked lines */}
          <ul className="divide-y divide-border sm:hidden" aria-label="Line items">
            {invoice.lineItems.map((item, index) => (
              <li
                key={`${item.productId}-${index}`}
                className="space-y-2 px-4 py-3.5"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {item.productNameSnapshot}
                  </p>
                  <p className="mt-0.5 font-mono text-xs tracking-wide text-muted-foreground">
                    {item.skuSnapshot}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Qty</dt>
                    <dd className="tabular-nums text-foreground">
                      {item.quantity}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Unit</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs text-muted-foreground">Line</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatMoney(item.lineTotal, invoice.currency)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-4 sm:px-5">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <div>
                <p className="text-base font-semibold text-foreground">Total</p>
                <p className="mt-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                  {invoice.currency}
                </p>
              </div>
              <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                {formattedTotal}
              </p>
            </div>
          </div>
        </section>

        {paymentSummary ? (
          <section
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
            aria-labelledby="invoice-payments-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <h3
                  id="invoice-payments-heading"
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  Payments
                </h3>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {paymentSummary.paymentCount === 0
                    ? "No payments recorded yet."
                    : `${paymentSummary.paymentCount} payment${paymentSummary.paymentCount === 1 ? "" : "s"} recorded.`}
                </p>
              </div>
              {canCreatePayment && paymentSummary.remaining > 0 ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/payments/new?invoiceId=${invoice.id}`}>
                    Record payment
                  </Link>
                </Button>
              ) : null}
            </div>
            <dl className="divide-y divide-border">
              <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                <dt className="text-sm text-muted-foreground">Invoice total</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(
                    paymentSummary.invoiceTotal,
                    paymentSummary.currency,
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                <dt className="text-sm text-muted-foreground">Paid</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(
                    paymentSummary.amountPaid,
                    paymentSummary.currency,
                  )}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                <dt className="text-sm text-muted-foreground">Remaining</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {formatMoney(
                    paymentSummary.remaining,
                    paymentSummary.currency,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        {invoice.notes ? (
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
                {invoice.notes}
              </p>
            </div>
          </section>
        ) : null}

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
