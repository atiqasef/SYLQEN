"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      invoices.find((invoice) => invoice.id === (initialInvoiceId ?? invoices[0]?.id)) ??
      invoices[0];
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

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Invoice
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Payments are recorded against an existing workspace invoice. Totals
            below are server-authoritative.
          </p>
        </div>

        <fieldset disabled={pending} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">Record payment</legend>

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
                  : "Only invoices from your workspace are listed."}
              </FieldHint>
            )}
          </div>

          {selected ? (
            <dl className="grid gap-3 rounded-[var(--radius-md)] border border-border bg-muted/40 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
              <div>
                <dt className="text-xs text-muted-foreground">Customer</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {selected.customerNameSnapshot}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Currency</dt>
                <dd className="mt-0.5 font-mono text-sm font-medium tracking-wide uppercase text-foreground">
                  {selected.currency}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Invoice total</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(selected.total, selected.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Already paid</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(selected.amountPaid, selected.currency)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Remaining balance</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                  {formatMoney(selected.remaining, selected.currency)}
                </dd>
              </div>
            </dl>
          ) : null}
        </fieldset>
      </div>

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
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="payment-amount">Amount</Label>
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
                className="tabular-nums"
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
                </FieldHint>
              )}
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
              >
                {PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </select>
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

            <div className="space-y-2 sm:col-span-2">
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
              />
            </div>
          </div>
        </fieldset>
      </div>

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
