import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentMethodBadge } from "@/features/payments/payment-method-badge";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import {
  getInvoicePaymentSummaryForSession,
  getPaymentForSession,
} from "@/server/payments/service";
import { cn } from "@/lib/utils/cn";

type PaymentDetailPageProps = {
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

export default async function PaymentDetailPage({
  params,
}: PaymentDetailPageProps) {
  const session = await requireVerifiedPageSession();
  const { id } = await params;

  let payment;
  try {
    payment = await getPaymentForSession(session, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    const appError = toAppError(error);
    return (
      <ErrorState
        title="Unable to load payment"
        description={appError.userMessage}
      />
    );
  }

  let invoiceSummary = null;
  try {
    invoiceSummary = await getInvoicePaymentSummaryForSession(
      session,
      payment.invoiceId,
    );
  } catch {
    invoiceSummary = null;
  }

  const formattedAmount = formatMoney(payment.amount, payment.currency);
  const paymentDateLabel = formatDateOnly(payment.paymentDate);
  const metaItems = [
    { label: "Invoice", value: payment.invoiceNumberSnapshot },
    { label: "Customer", value: payment.customerNameSnapshot },
    { label: "Date", value: paymentDateLabel },
    { label: "Currency", value: payment.currency },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-4" aria-labelledby="payment-detail-heading">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/payments"
                className="transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Payments
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-medium text-foreground">
              {payment.reference || formattedAmount}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-muted text-sm font-semibold tracking-wide text-foreground sm:size-14 sm:text-base"
              aria-hidden="true"
            >
              {payment.currency.slice(0, 2)}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="payment-detail-heading"
                  className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
                >
                  {formattedAmount}
                </h2>
                <PaymentMethodBadge method={payment.method} />
                {session.user.isDemo ? (
                  <Badge variant="warning">Demo read-only</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Payment for{" "}
                <Link
                  href={`/invoices/${payment.invoiceId}`}
                  className="font-mono font-medium tracking-wide text-foreground transition-ui hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {payment.invoiceNumberSnapshot}
                </Link>
                {" · "}
                <span className="font-medium text-foreground">
                  {payment.customerNameSnapshot}
                </span>
              </p>
              {payment.reference ? (
                <p className="truncate text-sm text-muted-foreground">
                  Ref{" "}
                  <span className="font-medium text-foreground">
                    {payment.reference}
                  </span>
                </p>
              ) : null}
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
                            item.label === "Invoice" && "font-mono tracking-wide",
                            item.label === "Date" && "tabular-nums",
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
              <Link href="/payments">Back to list</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/invoices/${payment.invoiceId}`}>View invoice</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-3xl gap-4">
        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="payment-info-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="payment-info-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Payment information
            </h3>
          </div>
          <dl className="divide-y divide-border">
            {[
              {
                label: "Invoice",
                value: payment.invoiceNumberSnapshot,
                mono: true,
              },
              { label: "Customer", value: payment.customerNameSnapshot },
              { label: "Payment date", value: paymentDateLabel },
              { label: "Reference", value: payment.reference },
            ].map((field) => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5"
              >
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 text-sm">
                  {field.label === "Invoice" ? (
                    <Link
                      href={`/invoices/${payment.invoiceId}`}
                      className="font-mono font-medium tracking-wide text-foreground transition-ui hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {payment.invoiceNumberSnapshot}
                    </Link>
                  ) : (
                    <DetailValue
                      value={field.value}
                      mono={"mono" in field && field.mono}
                    />
                  )}
                </dd>
              </div>
            ))}
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Method</dt>
              <dd className="min-w-0 text-sm">
                <PaymentMethodBadge method={payment.method} />
              </dd>
            </div>
          </dl>
        </section>

        {invoiceSummary ? (
          <section
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
            aria-labelledby="payment-financial-heading"
          >
            <div className="border-b border-border px-4 py-3.5 sm:px-5">
              <h3
                id="payment-financial-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Financial summary
              </h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Invoice balance after recorded payments (server-authoritative).
              </p>
            </div>
            <div className="space-y-3 px-4 py-5 sm:px-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Invoice total</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMoney(
                    invoiceSummary.invoiceTotal,
                    invoiceSummary.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMoney(
                    invoiceSummary.amountPaid,
                    invoiceSummary.currency,
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Remaining
                  </p>
                  <p className="mt-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                    {invoiceSummary.currency}
                  </p>
                </div>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {formatMoney(
                    invoiceSummary.remaining,
                    invoiceSummary.currency,
                  )}
                </p>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">This payment</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formattedAmount}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {payment.notes ? (
          <section
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
            aria-labelledby="payment-notes-heading"
          >
            <div className="border-b border-border px-4 py-3.5 sm:px-5">
              <h3
                id="payment-notes-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Notes
              </h3>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="text-sm leading-6 whitespace-pre-wrap break-words text-foreground">
                {payment.notes}
              </p>
            </div>
          </section>
        ) : null}

        <section
          className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
          aria-labelledby="payment-record-heading"
        >
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h3
              id="payment-record-heading"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Record
            </h3>
          </div>
          <dl className="divide-y divide-border">
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDateTime(payment.createdAt)}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
              <dt className="text-sm text-muted-foreground">Updated</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatDateTime(payment.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
