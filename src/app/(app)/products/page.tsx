import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PlusIcon } from "@/components/layout/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductsPagination } from "@/features/products/products-pagination";
import { ProductsSearchForm } from "@/features/products/products-search-form";
import { ProductsTable } from "@/features/products/products-table";
import { isAppError, toAppError } from "@/lib/errors/app-error";
import { requireVerifiedPageSession } from "@/server/auth/session";
import { listProductsForSession } from "@/server/products/service";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const session = await requireVerifiedPageSession();

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = firstParam(params.page);
  const pageSize = firstParam(params.pageSize);

  const canCreate = session.membership.permissions.includes("products.create");

  let list;
  try {
    list = await listProductsForSession(session, { q, page, pageSize });
  } catch (error) {
    const appError = toAppError(error);
    return (
      <div className="space-y-6 sm:space-y-8">
        <ProductsPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />
        <ErrorState
          title="Unable to load products"
          description={
            isAppError(error)
              ? appError.userMessage
              : "Something went wrong while loading products. Please try again."
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
      <ProductsPageHeader canCreate={canCreate} isDemo={session.user.isDemo} />

      {!isEmpty || hasQuery ? (
        <ProductsSearchForm q={q} pageSize={list.pageSize} />
      ) : null}

      {isEmpty ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start building your workspace catalog."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/products/new">
                  <PlusIcon aria-hidden="true" />
                  Add product
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Demo accounts are read-only and cannot create products.
              </p>
            )
          }
        />
      ) : null}

      {noResults ? (
        <EmptyState
          title="No matching products"
          description={`No products matched “${q}”. Try a different name, SKU, or description.`}
          action={
            <Button asChild variant="outline">
              <Link href="/products">Clear search</Link>
            </Button>
          }
        />
      ) : null}

      {list.total > 0 ? (
        <section className="space-y-4" aria-labelledby="products-results-heading">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-panel">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h3
                id="products-results-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Workspace products
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">
                  {list.total}
                </span>{" "}
                {list.total === 1 ? "product" : "products"}
                {hasQuery ? (
                  <>
                    {" "}
                    matching{" "}
                    <span className="font-medium text-foreground">“{q}”</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="sm:px-1">
              <ProductsTable products={list.items} />
            </div>
            <div className="px-4 pb-4 sm:px-5">
              <ProductsPagination result={list} q={q} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProductsPageHeader({
  canCreate,
  isDemo,
}: {
  canCreate: boolean;
  isDemo: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="products-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="products-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight"
            >
              Products
            </h2>
            {isDemo ? <Badge variant="warning">Demo read-only</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:text-[0.9375rem] sm:leading-7">
            Manage catalog products for your workspace. Search stays server-side
            and scoped to your membership.
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0">
            <Link href="/products/new">
              <PlusIcon aria-hidden="true" />
              Add product
            </Link>
          </Button>
        ) : null}
      </div>
      {isDemo && !canCreate ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground"
        >
          Demo accounts can view, search, and open products, but cannot create or
          edit them.
        </p>
      ) : null}
    </section>
  );
}
