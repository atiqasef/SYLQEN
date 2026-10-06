import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { FinanceIcon, PlusIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentsPagination } from "@/features/payments/payments-pagination";
import { PaymentsSearchForm } from "@/features/payments/payments-search-form";
import { PaymentsTable } from "@/features/payments/payments-table";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listPaymentsForSession } from "@/server/payments/service";

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const session = await requireVerifiedPageSession();

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = firstParam(params.page);
  const pageSize = firstParam(params.pageSize);

  const canCreate = session.membership.permissions.includes("payments.create");

  let list;
  try {
    list = await listPaymentsForSession(session, { q, page, pageSize });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <PaymentsPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />
        <ErrorState
          title="Unable to load payments"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading payments. Please try again."
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
      <PaymentsPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />

      {!isEmpty || hasQuery ? (
        <PaymentsSearchForm q={q} pageSize={list.pageSize} />
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={<FinanceIcon className="size-8" />}
          title="No payments yet"
          description="Record a payment against an existing invoice when you receive money."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/payments/new">
                  <PlusIcon aria-hidden="true" />
                  Record payment
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo accounts are read-only and cannot record payments.
              </p>
            )
          }
        />
      ) : null}

      {noResults ? (
        <EmptyState
          icon={<FinanceIcon className="size-8" />}
          title="No matching payments"
          description={`No payments matched “${q}”. Try a different invoice, customer, or reference.`}
          action={
            <Button asChild variant="outline">
              <Link href="/payments">Clear search</Link>
            </Button>
          }
        />
      ) : null}

      {list.total > 0 ? (
        <section className="space-y-4" aria-labelledby="payments-results-heading">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h3
                  id="payments-results-heading"
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  Workspace payments
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">
                    {list.total}
                  </span>{" "}
                  {list.total === 1 ? "payment" : "payments"}
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
              <PaymentsTable payments={list.items} />
            </div>
            <div className="px-4 pb-4 sm:px-5">
              <PaymentsPagination result={list} q={q} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PaymentsPageHeader({
  canCreate,
  isDemo,
}: {
  canCreate: boolean;
  isDemo: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="payments-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="payments-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
            >
              Payments
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            Track money received against workspace invoices. Search stays
            server-side; remaining balances are calculated on the server.
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0">
            <Link href="/payments/new">
              <PlusIcon aria-hidden="true" />
              Record payment
            </Link>
          </Button>
        ) : null}
      </div>
      {isDemo && !canCreate ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view, search, and open payments, but cannot record
          them.
        </p>
      ) : null}
    </section>
  );
}
