"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moneyToCents, centsToMoney } from "@/features/invoices/money";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/features/payments/schemas";
import { createPaymentAction } from "@/server/payments/actions";
import { cn } from "@/lib/utils/cn";

export type PaymentFormInvoiceOption = {
  id: string;
  invoiceNumber: string;
  customerNameSnapshot: string;
  total: number;
  currency: string;
  amountPaid: number;
  remaining: number;
};

type PaymentFormProps = {
  invoices: PaymentFormInvoiceOption[];
  initialInvoiceId?: string;
  cancelHref: string;
};

type FieldErrors = Record<string, string[] | undefined>;

function fieldError(fieldErrors: FieldErrors | undefined, key: string) {
  return fieldErrors?.[key]?.[0];
}

function FieldHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-xs leading-5 text-muted-foreground">
      {children}
    </p>
  );
}

function RequiredMark() {
  return (
    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      Required
    </span>
  );
}

function OptionalMark() {
  return (
    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      Optional
    </span>
  );
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

const selectClassName = cn(
  "flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 py-2 text-sm text-foreground shadow-panel transition-ui",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-destructive/60",
);

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

export function PaymentForm({
  invoices,
  initialInvoiceId,
  cancelHref,
}: PaymentFormProps) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = React.useState(() => {
    if (
      initialInvoiceId &&
      invoices.some((invoice) => invoice.id === initialInvoiceId)
    ) {
      return initialInvoiceId;
    }
    return invoices[0]?.id ?? "";
  });
  const [amount, setAmount] = React.useState(() => {
    const initial =
      invoices.find(
        (invoice) => invoice.id === (initialInvoiceId ?? invoices[0]?.id),
      ) ?? invoices[0];
    return initial && initial.remaining > 0 ? String(initial.remaining) : "";
  });
  const [paymentDate, setPaymentDate] = React.useState(todayDateOnly());
  const [method, setMethod] = React.useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>();
  const [pending, setPending] = React.useState(false);

  const selected = invoices.find((invoice) => invoice.id === invoiceId);

  const previewAmount = Number(amount);
  const hasPreviewAmount =
    Number.isFinite(previewAmount) && previewAmount > 0 && selected;
  const projectedRemaining = hasPreviewAmount
    ? centsToMoney(
        moneyToCents(selected.remaining) - moneyToCents(previewAmount),
      )
    : null;

  function selectInvoice(nextId: string) {
    setInvoiceId(nextId);
    const next = invoices.find((invoice) => invoice.id === nextId);
    setAmount(next && next.remaining > 0 ? String(next.remaining) : "");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors(undefined);

    const result = await createPaymentAction({
      invoiceId,
      amount,
      paymentDate,
      method,
      reference,
      notes,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    router.push(`/payments/${result.id}`);
    router.refresh();
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      {/* A. Invoice & Customer */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Invoice &amp; customer
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Choose the invoice this payment applies to. Ownership and currency
            are resolved on the server.
          </p>
        </div>

        <fieldset disabled={pending} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">Invoice and customer</legend>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="payment-invoice">Invoice</Label>
              <RequiredMark />
            </div>
            <select
              id="payment-invoice"
              name="invoiceId"
              required
              value={invoiceId}
              onChange={(event) => selectInvoice(event.target.value)}
              className={selectClassName}
              aria-invalid={Boolean(fieldError(fieldErrors, "invoiceId"))}
              aria-describedby={
                fieldError(fieldErrors, "invoiceId")
                  ? "payment-invoice-error"
                  : "payment-invoice-hint"
              }
            >
              <option value="">Select an invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} · {invoice.customerNameSnapshot} (
                  {formatMoney(invoice.remaining, invoice.currency)} remaining)
                </option>
              ))}
            </select>
            {fieldError(fieldErrors, "invoiceId") ? (
              <p
                id="payment-invoice-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {fieldError(fieldErrors, "invoiceId")}
              </p>
            ) : (
              <FieldHint id="payment-invoice-hint">
                {invoices.length === 0
                  ? "Create an invoice with a remaining balance before recording a payment."
                  : "Only open balances from your workspace are listed."}
              </FieldHint>
            )}
          </div>

          {selected ? (
            <dl className="grid gap-3 rounded-[var(--radius-md)] border border-border bg-muted/40 p-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3 sm:p-4">
              <div>
                <dt className="text-xs text-muted-foreground">Invoice</dt>
                <dd className="mt-0.5 font-mono text-sm font-medium tracking-wide text-foreground">
                  {selected.invoiceNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Customer</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
                  {selected.customerNameSnapshot}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Invoice total</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(selected.total, selected.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Currency</dt>
                <dd className="mt-0.5 font-mono text-sm font-medium tracking-wide uppercase text-foreground">
                  {selected.currency}
                </dd>
              </div>
            </dl>
          ) : null}
        </fieldset>
      </div>

      {/* B. Payment Details */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Payment details
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Amount is validated on the server and cannot exceed the remaining
            balance.
          </p>
        </div>

        <fieldset disabled={pending} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">Payment details</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="payment-amount">Payment amount</Label>
                <RequiredMark />
              </div>
              <Input
                id="payment-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min={0.01}
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-12 text-lg font-semibold tabular-nums tracking-tight"
                aria-invalid={Boolean(fieldError(fieldErrors, "amount"))}
                aria-describedby={
                  fieldError(fieldErrors, "amount")
                    ? "payment-amount-error"
                    : "payment-amount-hint"
                }
              />
              {fieldError(fieldErrors, "amount") ? (
                <p
                  id="payment-amount-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "amount")}
                </p>
              ) : (
                <FieldHint id="payment-amount-hint">
                  Must be greater than zero and at most the remaining balance.
                  {selected
                    ? ` Currency: ${selected.currency}.`
                    : null}
                </FieldHint>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="payment-method">Method</Label>
                <RequiredMark />
              </div>
              <select
                id="payment-method"
                name="method"
                required
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as PaymentMethod)
                }
                className={selectClassName}
                aria-describedby="payment-method-hint"
              >
                {PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </select>
              <FieldHint id="payment-method-hint">
                How this payment was received.
              </FieldHint>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="payment-date">Payment date</Label>
                <RequiredMark />
              </div>
              <Input
                id="payment-date"
                name="paymentDate"
                type="date"
                required
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="tabular-nums"
                aria-invalid={Boolean(fieldError(fieldErrors, "paymentDate"))}
              />
              {fieldError(fieldErrors, "paymentDate") ? (
                <p className="text-xs text-destructive" role="alert">
                  {fieldError(fieldErrors, "paymentDate")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="payment-reference">Reference</Label>
                <OptionalMark />
              </div>
              <Input
                id="payment-reference"
                name="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Bank transfer ID, check number, …"
                maxLength={120}
                aria-describedby="payment-reference-hint"
              />
              <FieldHint id="payment-reference-hint">
                Optional external reference for reconciliation.
              </FieldHint>
            </div>
          </div>
        </fieldset>
      </div>

      {/* C. Additional Information */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Additional information
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Optional context kept separate from financial fields.
          </p>
        </div>
        <fieldset disabled={pending} className="space-y-2 px-4 py-5 sm:px-5">
          <legend className="sr-only">Payment notes</legend>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="payment-notes">Notes</Label>
            <OptionalMark />
          </div>
          <Textarea
            id="payment-notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about this payment"
            aria-describedby="payment-notes-hint"
          />
          <FieldHint id="payment-notes-hint">
            Visible on the payment detail page.
          </FieldHint>
        </fieldset>
      </div>

      {/* D. Balance Summary */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
        aria-labelledby="payment-balance-heading"
      >
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3
            id="payment-balance-heading"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Balance summary
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Invoice totals and remaining balance come from the server. The
            projected remaining below is a preview only.
          </p>
        </div>
        <div className="space-y-3 px-4 py-5 sm:px-5">
          {selected ? (
            <>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Invoice total</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMoney(selected.total, selected.currency)}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Already paid</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMoney(selected.amountPaid, selected.currency)}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(selected.remaining, selected.currency)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">This payment</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {hasPreviewAmount
                    ? formatMoney(previewAmount, selected.currency)
                    : "—"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Projected remaining
                  </p>
                  <p className="mt-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                    {selected.currency}
                  </p>
                </div>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {projectedRemaining != null
                    ? formatMoney(projectedRemaining, selected.currency)
                    : "—"}
                </p>
              </div>
              {projectedRemaining != null && projectedRemaining < 0 ? (
                <p className="text-xs text-destructive" role="status">
                  Preview exceeds remaining balance — the server will reject this
                  amount.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground" role="note">
                  Browser previews cannot override server validation.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an invoice to see the balance summary.
            </p>
          )}
        </div>
      </div>

      {/* E. Actions */}
      <div
        className={cn(
          "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between",
          "rounded-[var(--radius-lg)] border border-border bg-muted/40 px-4 py-3.5 sm:px-5",
        )}
      >
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            invoices.length === 0 ||
            !selected ||
            selected.remaining <= 0
          }
          className="sm:min-w-[9.5rem]"
        >
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Recording payment" : ""}
      </span>
    </form>
  );
}
