"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductInput } from "@/features/products/schemas";
import {
  createProductAction,
  updateProductAction,
} from "@/server/products/actions";
import { cn } from "@/lib/utils/cn";

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialValues?: Partial<ProductInput>;
  readOnly?: boolean;
  readOnlyMessage?: string;
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

export function ProductForm({
  mode,
  productId,
  initialValues,
  readOnly = false,
  readOnlyMessage,
  cancelHref,
}: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialValues?.name ?? "");
  const [sku, setSku] = React.useState(initialValues?.sku ?? "");
  const [description, setDescription] = React.useState(
    initialValues?.description ?? "",
  );
  const [price, setPrice] = React.useState(
    initialValues?.price != null ? String(initialValues.price) : "",
  );
  const [currency, setCurrency] = React.useState(initialValues?.currency ?? "USD");
  const [unit, setUnit] = React.useState(initialValues?.unit ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>();
  const [pending, setPending] = React.useState(false);

  const disabled = pending || readOnly;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors(undefined);

    const payload = {
      name,
      sku,
      description,
      price,
      currency,
      unit,
    };

    const result =
      mode === "create"
        ? await createProductAction(payload)
        : await updateProductAction(productId!, payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    router.push(`/products/${result.id}`);
    router.refresh();
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      {readOnly && readOnlyMessage ? (
        <AuthAlert>{readOnlyMessage}</AuthAlert>
      ) : null}
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Product identity
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Name and SKU identify this product in your workspace catalog.
          </p>
        </div>

        <fieldset disabled={disabled} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">
            {mode === "create" ? "Create product" : "Edit product"}
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="product-name">Name</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="product-name"
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Standard consulting hour"
                aria-invalid={Boolean(fieldError(fieldErrors, "name"))}
                aria-describedby={
                  fieldError(fieldErrors, "name")
                    ? "product-name-error"
                    : "product-name-hint"
                }
              />
              {fieldError(fieldErrors, "name") ? (
                <p
                  id="product-name-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "name")}
                </p>
              ) : (
                <FieldHint id="product-name-hint">
                  Primary display name for this catalog item.
                </FieldHint>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="product-sku">SKU</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="product-sku"
                name="sku"
                required
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="SVC-HOUR-001"
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono text-sm tracking-wide uppercase"
                aria-invalid={Boolean(fieldError(fieldErrors, "sku"))}
                aria-describedby={
                  fieldError(fieldErrors, "sku")
                    ? "product-sku-error"
                    : "product-sku-hint"
                }
              />
              {fieldError(fieldErrors, "sku") ? (
                <p
                  id="product-sku-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "sku")}
                </p>
              ) : (
                <FieldHint id="product-sku-hint">
                  Must be unique within your workspace. Saved in uppercase.
                </FieldHint>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Pricing
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            List price and billing unit for this product.
          </p>
        </div>

        <fieldset disabled={disabled} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">Product pricing</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="product-price">Price</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="product-price"
                name="price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="150.00"
                className="tabular-nums"
                aria-invalid={Boolean(fieldError(fieldErrors, "price"))}
                aria-describedby={
                  fieldError(fieldErrors, "price")
                    ? "product-price-error"
                    : "product-price-hint"
                }
              />
              {fieldError(fieldErrors, "price") ? (
                <p
                  id="product-price-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "price")}
                </p>
              ) : (
                <FieldHint id="product-price-hint">
                  Non-negative amount in the selected currency.
                </FieldHint>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="product-currency">Currency</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="product-currency"
                name="currency"
                required
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                placeholder="USD"
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono uppercase tracking-wide"
                aria-invalid={Boolean(fieldError(fieldErrors, "currency"))}
                aria-describedby={
                  fieldError(fieldErrors, "currency")
                    ? "product-currency-error"
                    : "product-currency-hint"
                }
              />
              {fieldError(fieldErrors, "currency") ? (
                <p
                  id="product-currency-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "currency")}
                </p>
              ) : (
                <FieldHint id="product-currency-hint">
                  3-letter ISO code (for example USD).
                </FieldHint>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="product-unit">Unit</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Input
                id="product-unit"
                name="unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="hour, seat, license…"
                aria-invalid={Boolean(fieldError(fieldErrors, "unit"))}
                aria-describedby={
                  fieldError(fieldErrors, "unit")
                    ? "product-unit-error"
                    : "product-unit-hint"
                }
              />
              {fieldError(fieldErrors, "unit") ? (
                <p
                  id="product-unit-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "unit")}
                </p>
              ) : (
                <FieldHint id="product-unit-hint">
                  How this product is measured or billed.
                </FieldHint>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Additional information
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Optional context that helps your team recognize this product.
          </p>
        </div>

        <fieldset disabled={disabled} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">Additional product information</legend>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="product-description">Description</Label>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Optional
              </span>
            </div>
            <Textarea
              id="product-description"
              name="description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description for your team"
              aria-invalid={Boolean(fieldError(fieldErrors, "description"))}
              aria-describedby={
                fieldError(fieldErrors, "description")
                  ? "product-description-error"
                  : "product-description-hint"
              }
            />
            {fieldError(fieldErrors, "description") ? (
              <p
                id="product-description-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {fieldError(fieldErrors, "description")}
              </p>
            ) : (
              <FieldHint id="product-description-hint">
                Visible to workspace members with product access.
              </FieldHint>
            )}
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
        <Button type="submit" disabled={disabled} className="sm:min-w-[9.5rem]">
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create product"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
