import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomersPagination } from "@/features/customers/customers-pagination";
import { CustomersSearchForm } from "@/features/customers/customers-search-form";
import { CustomersTable } from "@/features/customers/customers-table";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listCustomersForSession } from "@/server/customers/service";
import { connectMongo } from "@/server/db/mongodb";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await requireVerifiedPageSession();
  await connectMongo();

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = firstParam(params.page);
  const pageSize = firstParam(params.pageSize);

  const canCreate = session.membership.permissions.includes("customers.create");

  let list;
  try {
    list = await listCustomersForSession(session, { q, page, pageSize });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6">
        <CustomersPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />
        <ErrorState
          title="Unable to load customers"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading customers. Please try again."
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
      <CustomersPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />

      <CustomersSearchForm q={q} pageSize={list.pageSize} />

      {isEmpty ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start building your workspace CRM foundation."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/customers/new">Add customer</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo accounts are read-only and cannot create customers.
              </p>
            )
          }
        />
      ) : null}

      {noResults ? (
        <EmptyState
          title="No matching customers"
          description={`No customers matched “${q}”. Try a different name, email, company, or phone.`}
          action={
            <Button asChild variant="outline">
              <Link href="/customers">Clear search</Link>
            </Button>
          }
        />
      ) : null}

      {list.total > 0 ? (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
            <div className="border-b border-border px-3 py-3 sm:px-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{list.total}</span>{" "}
                {list.total === 1 ? "customer" : "customers"}
                {hasQuery ? (
                  <>
                    {" "}
                    matching{" "}
                    <span className="font-medium text-foreground">“{q}”</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="px-2 py-1 sm:px-3">
              <CustomersTable customers={list.items} />
            </div>
          </div>
          <CustomersPagination result={list} q={q} />
        </div>
      ) : null}
    </div>
  );
}

function CustomersPageHeader({
  canCreate,
  isDemo,
}: {
  canCreate: boolean;
  isDemo: boolean;
}) {
  return (
    <section className="space-y-4" aria-labelledby="customers-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="customers-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
            >
              Customers
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            Search and manage customer records in your workspace. Changes are
            scoped to your authenticated membership.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/customers/new">Add customer</Link>
          </Button>
        ) : null}
      </div>
      {isDemo && !canCreate ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/70 px-3 py-2.5 text-sm text-muted-foreground"
        >
          Demo accounts can view, search, and open customers, but cannot create or
          edit them.
        </p>
      ) : null}
    </section>
  );
}
