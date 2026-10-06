"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerInput } from "@/features/customers/schemas";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/server/customers/actions";
import { cn } from "@/lib/utils/cn";

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: string;
  initialValues?: Partial<CustomerInput>;
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

export function CustomerForm({
  mode,
  customerId,
  initialValues,
  readOnly = false,
  readOnlyMessage,
  cancelHref,
}: CustomerFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialValues?.name ?? "");
  const [email, setEmail] = React.useState(initialValues?.email ?? "");
  const [phone, setPhone] = React.useState(initialValues?.phone ?? "");
  const [company, setCompany] = React.useState(initialValues?.company ?? "");
  const [address, setAddress] = React.useState(initialValues?.address ?? "");
  const [notes, setNotes] = React.useState(initialValues?.notes ?? "");
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
      email,
      phone,
      company,
      address,
      notes,
    };

    const result =
      mode === "create"
        ? await createCustomerAction(payload)
        : await updateCustomerAction(customerId!, payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    router.push(`/customers/${result.id}`);
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
            Contact details
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Required fields identify the customer in your workspace.
          </p>
        </div>

        <fieldset disabled={disabled} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">
            {mode === "create" ? "Create customer" : "Edit customer"}
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="customer-name">Name</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="customer-name"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Cooper"
                aria-invalid={Boolean(fieldError(fieldErrors, "name"))}
                aria-describedby={
                  fieldError(fieldErrors, "name")
                    ? "customer-name-error"
                    : "customer-name-hint"
                }
              />
              {fieldError(fieldErrors, "name") ? (
                <p
                  id="customer-name-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "name")}
                </p>
              ) : (
                <FieldHint id="customer-name-hint">
                  Primary display name for this customer.
                </FieldHint>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="customer-email">Email</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required
                </span>
              </div>
              <Input
                id="customer-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane@company.com"
                aria-invalid={Boolean(fieldError(fieldErrors, "email"))}
                aria-describedby={
                  fieldError(fieldErrors, "email")
                    ? "customer-email-error"
                    : "customer-email-hint"
                }
              />
              {fieldError(fieldErrors, "email") ? (
                <p
                  id="customer-email-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {fieldError(fieldErrors, "email")}
                </p>
              ) : (
                <FieldHint id="customer-email-hint">
                  Must be unique within your workspace.
                </FieldHint>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="customer-phone">Phone</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Input
                id="customer-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 0100"
                aria-invalid={Boolean(fieldError(fieldErrors, "phone"))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="customer-company">Company</Label>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Optional
                </span>
              </div>
              <Input
                id="customer-company"
                name="company"
                autoComplete="organization"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Acme Operations"
                aria-invalid={Boolean(fieldError(fieldErrors, "company"))}
              />
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
            Optional context that helps your team recognize this customer.
          </p>
        </div>

        <fieldset disabled={disabled} className="space-y-5 px-4 py-5 sm:px-5">
          <legend className="sr-only">Additional customer information</legend>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="customer-address">Address</Label>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Optional
              </span>
            </div>
            <Textarea
              id="customer-address"
              name="address"
              autoComplete="street-address"
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, city, region"
              aria-invalid={Boolean(fieldError(fieldErrors, "address"))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="customer-notes">Notes</Label>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Optional
              </span>
            </div>
            <Textarea
              id="customer-notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Internal notes for your team"
              aria-invalid={Boolean(fieldError(fieldErrors, "notes"))}
              aria-describedby="customer-notes-hint"
            />
            <FieldHint id="customer-notes-hint">
              Visible to workspace members with customer access.
            </FieldHint>
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
              ? "Create customer"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
