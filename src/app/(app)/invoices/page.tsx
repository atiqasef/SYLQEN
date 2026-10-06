import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { FinanceIcon, PlusIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoicesPagination } from "@/features/invoices/invoices-pagination";
import { InvoicesSearchForm } from "@/features/invoices/invoices-search-form";
import { InvoicesTable } from "@/features/invoices/invoices-table";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listInvoicesForSession } from "@/server/invoices/service";

type InvoicesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const session = await requireVerifiedPageSession();

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = firstParam(params.page);
  const pageSize = firstParam(params.pageSize);

  const canCreate = session.membership.permissions.includes("invoices.create");

  let list;
  try {
    list = await listInvoicesForSession(session, { q, page, pageSize });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <InvoicesPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />
        <ErrorState
          title="Unable to load invoices"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading invoices. Please try again."
          }
        />
      </div>
    );
  }

  const hasQuery = Boolean(list && q);
  const isEmpty = list.total === 0 && !hasQuery;
  const noResults = list.total === 0 && hasQuery;

  return (
    <div className="space-y-6 sm:space-y-8">
      <InvoicesPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />

      {!isEmpty || hasQuery ? (
        <InvoicesSearchForm q={q} pageSize={list.pageSize} />
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={<FinanceIcon className="size-8" />}
          title="No invoices yet"
          description="Create your first invoice from an existing customer and catalog products."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/invoices/new">
                  <PlusIcon aria-hidden="true" />
                  Add invoice
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo accounts are read-only and cannot create invoices.
              </p>
            )
          }
        />
      ) : null}

      {noResults ? (
        <EmptyState
          icon={<FinanceIcon className="size-8" />}
          title="No matching invoices"
          description={`No invoices matched “${q}”. Try a different invoice number or customer name.`}
          action={
            <Button asChild variant="outline">
              <Link href="/invoices">Clear search</Link>
            </Button>
          }
        />
      ) : null}

      {list.total > 0 ? (
        <section className="space-y-4" aria-labelledby="invoices-results-heading">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h3
                  id="invoices-results-heading"
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  Workspace invoices
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">
                    {list.total}
                  </span>{" "}
                  {list.total === 1 ? "invoice" : "invoices"}
                  {hasQuery ? (
                    <>
                      {" "}
                      matching{" "}
                      <span className="font-medium text-foreground">“{q}”</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="sm:px-1">
              <InvoicesTable invoices={list.items} />
            </div>
            <div className="px-4 pb-4 sm:px-5">
              <InvoicesPagination result={list} q={q} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InvoicesPageHeader({
  canCreate,
  isDemo,
}: {
  canCreate: boolean;
  isDemo: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="invoices-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="invoices-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
            >
              Invoices
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            Bill customers with product line items. Invoice numbers and totals
            are calculated on the server and scoped to your workspace.
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0">
            <Link href="/invoices/new">
              <PlusIcon aria-hidden="true" />
              Add invoice
            </Link>
          </Button>
        ) : null}
      </div>
      {isDemo && !canCreate ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view, search, and open invoices, but cannot create or
          edit them.
        </p>
      ) : null}
    </section>
  );
}
