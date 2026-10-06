"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { SearchIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvoicesSearchFormProps = {
  q?: string;
  pageSize: number;
};

export function InvoicesSearchForm({ q, pageSize }: InvoicesSearchFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const hasQuery = Boolean(q);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams();

    if (nextQuery) {
      params.set("q", nextQuery.slice(0, 100));
    }
    if (pageSize !== 20) {
      params.set("pageSize", String(pageSize));
    }

    const href = params.size > 0 ? `/invoices?${params.toString()}` : "/invoices";
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5"
      role="search"
      aria-busy={pending}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="invoices-search">Search invoices</Label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="invoices-search"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Invoice number or customer"
              maxLength={100}
              autoComplete="off"
              disabled={pending}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasQuery ? (
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link
                href={
                  pageSize !== 20
                    ? `/invoices?pageSize=${pageSize}`
                    : "/invoices"
                }
              >
                Clear
              </Link>
            </Button>
          ) : null}
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Searching invoices" : ""}
      </span>
    </form>
  );
}
