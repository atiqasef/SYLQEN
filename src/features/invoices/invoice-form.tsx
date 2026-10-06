"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { CloseIcon, PlusIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateLineTotal, sumMoney } from "@/features/invoices/money";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type InvoiceInput,
  type InvoiceStatus,
} from "@/features/invoices/schemas";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/server/invoices/actions";
import { cn } from "@/lib/utils/cn";

export type InvoiceFormCustomerOption = {
  id: string;
  name: string;
};

export type InvoiceFormProductOption = {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
};

type LineDraft = {
  key: string;
  productId: string;
  quantity: string;
};

type InvoiceFormProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  invoiceNumber?: string;
  customers: InvoiceFormCustomerOption[];
  products: InvoiceFormProductOption[];
  initialValues?: Partial<InvoiceInput>;
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

function newLineKey() {
  return `line-${Math.random().toString(36).slice(2, 10)}`;
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

export function InvoiceForm({
  mode,
  invoiceId,
  invoiceNumber,
  customers,
  products,
  initialValues,
  cancelHref,
}: InvoiceFormProps) {
  const router = useRouter();
  const productById = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const [customerId, setCustomerId] = React.useState(
    initialValues?.customerId ?? "",
  );
  const [status, setStatus] = React.useState<InvoiceStatus>(
    initialValues?.status ?? "draft",
  );
  const [issueDate, setIssueDate] = React.useState(
    initialValues?.issueDate ?? todayDateOnly(),
  );
  const [dueDate, setDueDate] = React.useState(
    initialValues?.dueDate ?? todayDateOnly(),
  );
  const [notes, setNotes] = React.useState(initialValues?.notes ?? "");
  const [lines, setLines] = React.useState<LineDraft[]>(() => {
    if (initialValues?.lineItems?.length) {
      return initialValues.lineItems.map((item) => ({
        key: newLineKey(),
        productId: item.productId,
        quantity: String(item.quantity),
      }));
    }
    return [{ key: newLineKey(), productId: "", quantity: "1" }];
  });
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>();
  const [pending, setPending] = React.useState(false);

  const previewCurrency =
    lines
      .map((line) => productById.get(line.productId)?.currency)
      .find(Boolean) ??
    initialValues?.currency ??
    products[0]?.currency ??
    "USD";

  const previewLines = lines.map((line) => {
    const product = productById.get(line.productId);
    const quantity = Number(line.quantity);
    const unitPrice = product?.price ?? 0;
    const lineTotal =
      product && Number.isFinite(quantity) && quantity > 0
        ? calculateLineTotal(quantity, unitPrice)
        : 0;
    return { product, quantity, unitPrice, lineTotal };
  });

  const previewSubtotal = sumMoney(previewLines.map((line) => line.lineTotal));

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { key: newLineKey(), productId: "", quantity: "1" },
    ]);
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length <= 1 ? current : current.filter((line) => line.key !== key),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors(undefined);

    const payload = {
      customerId,
      status,
      issueDate,
      dueDate,
      currency: previewCurrency,
      notes,
      lineItems: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    };

    const result =
      mode === "create"
        ? await createInvoiceAction(payload)
        : await updateInvoiceAction(invoiceId!, payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    router.push(`/invoices/${result.id}`);
    router.refresh();
  }

  return (
    <form
      className="mx-auto max-w-3xl space-y-5"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      {invoiceNumber ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-muted/40 px-4 py-3 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Editing{" "}
            <span className="font-mono font-medium tracking-wide text-foreground">
              {invoiceNumber}
            </span>
            . The invoice number is assigned by the server and cannot be changed.
          </p>
        </div>
      ) : null}

      {/* A. Customer & Invoice Details */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Customer &amp; invoice details
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Who you are billing, when, and the current status of this invoice.
          </p>
        </div>

        <fieldset disabled={pending} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">
            {mode === "create" ? "Create invoice" : "Edit invoice"}
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="invoice-customer">Customer</Label>
                <RequiredMark />
              </div>
              <select
                id="invoice-customer"
                name="customerId"
                required
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className={selectClassName}
                aria-invalid={Boolean(fieldError(fieldErrors, "customerId"))}
                aria-describedby={
                  fieldError(fieldErrors, "customerId")
                    ? "invoice-customer-error"
                    : "invoice-customer-hint"
                }
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {fieldError(fieldErrors, "customerId") ? (
                <p
                  id="invoice-customer-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "customerId")}
                </p>
              ) : (
                <FieldHint id="invoice-customer-hint">
                  {customers.length === 0
                    ? "Add a customer before creating an invoice."
                    : "Resolved on the server within your workspace."}
                </FieldHint>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="invoice-status">Status</Label>
                <RequiredMark />
              </div>
              <select
                id="invoice-status"
                name="status"
                required
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as InvoiceStatus)
                }
                className={selectClassName}
                aria-describedby="invoice-status-hint"
              >
                {INVOICE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {INVOICE_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <FieldHint id="invoice-status-hint">
                New invoices default to Draft.
              </FieldHint>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-currency">Currency</Label>
              <Input
                id="invoice-currency"
                name="currency"
                value={previewCurrency}
                readOnly
                className="font-mono uppercase tracking-wide"
                aria-describedby="invoice-currency-hint"
              />
              <FieldHint id="invoice-currency-hint">
                Derived from selected products. Mixed currencies are rejected.
              </FieldHint>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="invoice-issue-date">Issue date</Label>
                <RequiredMark />
              </div>
              <Input
                id="invoice-issue-date"
                name="issueDate"
                type="date"
                required
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                className="tabular-nums"
                aria-invalid={Boolean(fieldError(fieldErrors, "issueDate"))}
                aria-describedby={
                  fieldError(fieldErrors, "issueDate")
                    ? "invoice-issue-date-error"
                    : undefined
                }
              />
              {fieldError(fieldErrors, "issueDate") ? (
                <p
                  id="invoice-issue-date-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "issueDate")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="invoice-due-date">Due date</Label>
                <RequiredMark />
              </div>
              <Input
                id="invoice-due-date"
                name="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="tabular-nums"
                aria-invalid={Boolean(fieldError(fieldErrors, "dueDate"))}
                aria-describedby={
                  fieldError(fieldErrors, "dueDate")
                    ? "invoice-due-date-error"
                    : "invoice-due-date-hint"
                }
              />
              {fieldError(fieldErrors, "dueDate") ? (
                <p
                  id="invoice-due-date-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "dueDate")}
                </p>
              ) : (
                <FieldHint id="invoice-due-date-hint">
                  Must be on or after the issue date.
                </FieldHint>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      {/* B. Line Items */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Line items
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Products, quantities, and prices. Totals shown here are a preview
              only — the server recalculates on save.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={pending || products.length === 0}
            className="shrink-0"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            Add item
          </Button>
        </div>

        <fieldset disabled={pending} className="space-y-4 px-4 py-5 sm:px-5">
          <legend className="sr-only">Invoice line items</legend>

          {fieldError(fieldErrors, "lineItems") ? (
            <p className="text-xs text-destructive" role="alert">
              {fieldError(fieldErrors, "lineItems")}
            </p>
          ) : null}

          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a product before creating an invoice.
            </p>
          ) : null}

          {/* Desktop column headers */}
          <div
            className="hidden gap-3 border-b border-border pb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1.6fr)_5.5rem_6.5rem_6.5rem_2.5rem]"
            aria-hidden="true"
          >
            <span>Product</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Line total</span>
            <span className="sr-only">Remove</span>
          </div>

          <ul className="space-y-3 md:space-y-0 md:divide-y md:divide-border">
            {lines.map((line, index) => {
              const preview = previewLines[index];
              const product = preview?.product;
              const productError = fieldError(
                fieldErrors,
                `lineItems.${index}.productId`,
              );
              const qtyError = fieldError(
                fieldErrors,
                `lineItems.${index}.quantity`,
              );

              return (
                <li
                  key={line.key}
                  className={cn(
                    "rounded-[var(--radius-md)] border border-border p-3 md:rounded-none md:border-0 md:p-0 md:py-3.5",
                    "md:grid md:grid-cols-[minmax(0,1.6fr)_5.5rem_6.5rem_6.5rem_2.5rem] md:items-start md:gap-3",
                  )}
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor={`invoice-line-product-${line.key}`}
                      className="md:sr-only"
                    >
                      Product
                    </Label>
                    <select
                      id={`invoice-line-product-${line.key}`}
                      value={line.productId}
                      onChange={(event) =>
                        updateLine(line.key, { productId: event.target.value })
                      }
                      className={selectClassName}
                      aria-invalid={Boolean(productError)}
                      aria-describedby={
                        productError
                          ? `invoice-line-product-error-${line.key}`
                          : product
                            ? `invoice-line-sku-${line.key}`
                            : undefined
                      }
                    >
                      <option value="">Select a product</option>
                      {products.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.sku})
                        </option>
                      ))}
                    </select>
                    {productError ? (
                      <p
                        id={`invoice-line-product-error-${line.key}`}
                        className="text-xs text-destructive"
                        role="alert"
                      >
                        {productError}
                      </p>
                    ) : product ? (
                      <p
                        id={`invoice-line-sku-${line.key}`}
                        className="truncate font-mono text-xs tracking-wide text-muted-foreground"
                      >
                        {product.sku}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2 md:mt-0">
                    <Label
                      htmlFor={`invoice-line-qty-${line.key}`}
                      className="md:sr-only"
                    >
                      Quantity
                    </Label>
                    <Input
                      id={`invoice-line-qty-${line.key}`}
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="any"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      className="tabular-nums md:text-right"
                      aria-invalid={Boolean(qtyError)}
                      aria-describedby={
                        qtyError
                          ? `invoice-line-qty-error-${line.key}`
                          : undefined
                      }
                    />
                    {qtyError ? (
                      <p
                        id={`invoice-line-qty-error-${line.key}`}
                        className="text-xs text-destructive"
                        role="alert"
                      >
                        {qtyError}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-1 md:mt-0 md:pt-2.5 md:text-right">
                    <p className="text-xs text-muted-foreground md:sr-only">
                      Unit price
                    </p>
                    <p className="text-sm tabular-nums text-foreground">
                      {product
                        ? formatMoney(product.price, product.currency)
                        : "—"}
                    </p>
                  </div>

                  <div className="mt-3 space-y-1 md:mt-0 md:pt-2.5 md:text-right">
                    <p className="text-xs text-muted-foreground md:sr-only">
                      Line total
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {product
                        ? formatMoney(preview?.lineTotal ?? 0, product.currency)
                        : "—"}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-end md:mt-0 md:pt-1 md:justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 1}
                      aria-label={`Remove line item ${index + 1}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <CloseIcon className="size-4" aria-hidden="true" />
                      <span className="md:sr-only">Remove</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      {/* C. Notes */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Notes
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Optional context shown on the invoice record.
          </p>
        </div>
        <fieldset disabled={pending} className="space-y-2 px-4 py-5 sm:px-5">
          <legend className="sr-only">Invoice notes</legend>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="invoice-notes">Additional notes</Label>
            <OptionalMark />
          </div>
          <Textarea
            id="invoice-notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Payment terms, delivery notes, or other context"
            aria-describedby="invoice-notes-hint"
          />
          <FieldHint id="invoice-notes-hint">
            Visible on the invoice detail page. Not emailed in this phase.
          </FieldHint>
        </fieldset>
      </div>

      {/* D. Summary / Totals */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel"
        aria-labelledby="invoice-form-totals-heading"
      >
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3
            id="invoice-form-totals-heading"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Summary
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Preview amounts. Authoritative totals are calculated on the server.
          </p>
        </div>
        <div className="space-y-3 px-4 py-5 sm:px-5">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatMoney(previewSubtotal, previewCurrency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <div>
              <p className="text-base font-semibold text-foreground">Total</p>
              <p className="mt-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                {previewCurrency}
              </p>
            </div>
            <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
              {formatMoney(previewSubtotal, previewCurrency)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground" role="note">
            Browser totals are for display only and cannot override server
            calculations.
          </p>
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
          disabled={pending || customers.length === 0 || products.length === 0}
          className="sm:min-w-[9.5rem]"
          aria-live="polite"
        >
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create invoice"
              : "Save changes"}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {pending
          ? mode === "create"
            ? "Creating invoice"
            : "Saving invoice"
          : ""}
      </span>
    </form>
  );
}
