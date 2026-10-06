"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
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
        <p className="text-sm text-muted-foreground">
          Invoice{" "}
          <span className="font-mono font-medium text-foreground">
            {invoiceNumber}
          </span>{" "}
          · number is assigned by the server and cannot be changed.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Invoice details
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Customer, dates, and status for this invoice.
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
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <select
                id="invoice-customer"
                name="customerId"
                required
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className={selectClassName}
                aria-invalid={Boolean(fieldError(fieldErrors, "customerId"))}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {fieldError(fieldErrors, "customerId") ? (
                <p className="text-xs text-destructive" role="alert">
                  {fieldError(fieldErrors, "customerId")}
                </p>
              ) : customers.length === 0 ? (
                <FieldHint id="invoice-customer-hint">
                  Add a customer before creating an invoice.
                </FieldHint>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="invoice-status">Status</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
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
              >
                {INVOICE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {INVOICE_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
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
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
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
              />
              {fieldError(fieldErrors, "issueDate") ? (
                <p className="text-xs text-destructive" role="alert">
                  {fieldError(fieldErrors, "issueDate")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="invoice-due-date">Due date</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
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

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Line items
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Products are resolved and priced on the server.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={pending || products.length === 0}
          >
            Add line
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

          <ul className="space-y-4">
            {lines.map((line, index) => {
              const preview = previewLines[index];
              const product = preview?.product;
              return (
                <li
                  key={line.key}
                  className="grid gap-3 rounded-[var(--radius-md)] border border-border p-3 sm:grid-cols-[minmax(0,1.4fr)_6rem_minmax(0,1fr)_auto] sm:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`invoice-line-product-${line.key}`}>
                      Product
                    </Label>
                    <select
                      id={`invoice-line-product-${line.key}`}
                      value={line.productId}
                      onChange={(event) =>
                        updateLine(line.key, { productId: event.target.value })
                      }
                      className={selectClassName}
                      aria-invalid={Boolean(
                        fieldError(fieldErrors, `lineItems.${index}.productId`),
                      )}
                    >
                      <option value="">Select a product</option>
                      {products.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`invoice-line-qty-${line.key}`}>Qty</Label>
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
                      className="tabular-nums"
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-xs text-muted-foreground">Unit / line</p>
                    <p className="tabular-nums text-foreground">
                      {product
                        ? formatMoney(product.price, product.currency)
                        : "—"}
                    </p>
                    <p className="font-medium tabular-nums text-foreground">
                      {product
                        ? formatMoney(preview?.lineTotal ?? 0, product.currency)
                        : "—"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length <= 1}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-end gap-1 border-t border-border pt-4 text-sm">
            <p className="text-muted-foreground">
              Subtotal{" "}
              <span className="ml-3 font-medium tabular-nums text-foreground">
                {formatMoney(previewSubtotal, previewCurrency)}
              </span>
            </p>
            <p className="text-base font-semibold text-foreground">
              Total{" "}
              <span className="ml-3 tabular-nums">
                {formatMoney(previewSubtotal, previewCurrency)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Preview only — totals are recalculated on the server.
            </p>
          </div>
        </fieldset>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Notes
          </h3>
        </div>
        <fieldset disabled={pending} className="space-y-2 px-4 py-5 sm:px-5">
          <legend className="sr-only">Invoice notes</legend>
          <Label htmlFor="invoice-notes">Notes</Label>
          <Textarea
            id="invoice-notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes for this invoice"
          />
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
          disabled={pending || customers.length === 0 || products.length === 0}
          className="sm:min-w-[9.5rem]"
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
    </form>
  );
}
