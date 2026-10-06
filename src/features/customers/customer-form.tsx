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
      className="mx-auto max-w-2xl space-y-6"
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
    >
      {readOnly && readOnlyMessage ? (
        <AuthAlert>{readOnlyMessage}</AuthAlert>
      ) : null}
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <fieldset disabled={disabled} className="space-y-5">
        <legend className="sr-only">
          {mode === "create" ? "Create customer" : "Edit customer"}
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldError(fieldErrors, "name"))}
              aria-describedby={
                fieldError(fieldErrors, "name") ? "customer-name-error" : undefined
              }
            />
            {fieldError(fieldErrors, "name") ? (
              <p id="customer-name-error" className="text-xs text-destructive" role="alert">
                {fieldError(fieldErrors, "name")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldError(fieldErrors, "email"))}
              aria-describedby={
                fieldError(fieldErrors, "email")
                  ? "customer-email-error"
                  : undefined
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
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="customer-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={Boolean(fieldError(fieldErrors, "phone"))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-company">
              Company{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="customer-company"
              name="company"
              autoComplete="organization"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              aria-invalid={Boolean(fieldError(fieldErrors, "company"))}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-address">
              Address{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="customer-address"
              name="address"
              autoComplete="street-address"
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              aria-invalid={Boolean(fieldError(fieldErrors, "address"))}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-notes">
              Notes{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="customer-notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              aria-invalid={Boolean(fieldError(fieldErrors, "notes"))}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={disabled}>
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create customer"
              : "Save changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
