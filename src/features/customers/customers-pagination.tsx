import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { CustomerListResult } from "@/server/customers/types";

function buildHref(options: {
  page: number;
  q?: string;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  if (options.q) {
    params.set("q", options.q);
  }
  if (options.pageSize !== 20) {
    params.set("pageSize", String(options.pageSize));
  }
  if (options.page > 1) {
    params.set("page", String(options.page));
  }
  const query = params.toString();
  return query ? `/customers?${query}` : "/customers";
}

type CustomersPaginationProps = {
  result: CustomerListResult;
  q?: string;
};

export function CustomersPagination({ result, q }: CustomersPaginationProps) {
  if (result.pageCount <= 1) {
    return null;
  }

  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);
  const hasPrev = result.page > 1;
  const hasNext = result.page < result.pageCount;

  return (
    <nav
      className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Customer list pagination"
    >
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium tabular-nums text-foreground">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="font-medium tabular-nums text-foreground">
          {result.total}
        </span>
      </p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              href={buildHref({
                page: result.page - 1,
                q,
                pageSize: result.pageSize,
              })}
              rel="prev"
            >
              Previous
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        <span
          className="min-w-[5.5rem] text-center text-sm tabular-nums text-muted-foreground"
          aria-current="page"
        >
          Page {result.page} of {result.pageCount}
        </span>
        {hasNext ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              href={buildHref({
                page: result.page + 1,
                q,
                pageSize: result.pageSize,
              })}
              rel="next"
            >
              Next
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}
