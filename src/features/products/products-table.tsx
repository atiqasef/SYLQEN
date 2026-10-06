import Link from "next/link";

import { ChevronRightIcon } from "@/components/layout/icons";
import type { ProductDTO } from "@/server/products/types";
import { cn } from "@/lib/utils/cn";

type ProductsTableProps = {
  products: ProductDTO[];
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export function ProductsTable({ products }: ProductsTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Products in your workspace</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Product
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Price
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Unit
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Added
              </th>
              <th scope="col" className="w-10 px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="group border-b border-border last:border-0 transition-ui hover:bg-muted/45"
              >
                <th scope="row" className="px-4 py-3.5 font-normal">
                  <Link
                    href={`/products/${product.id}`}
                    className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block truncate font-medium text-foreground group-hover:text-primary">
                      {product.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs tracking-wide text-muted-foreground sm:text-[0.8125rem]">
                      {product.sku}
                    </span>
                  </Link>
                </th>
                <td className="px-4 py-3.5 text-right">
                  <span className="block font-medium tabular-nums text-foreground">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  <span className="mt-0.5 block text-[11px] tracking-wide text-muted-foreground uppercase">
                    {product.currency}
                  </span>
                </td>
                <td className="hidden max-w-[8rem] truncate px-4 py-3.5 text-muted-foreground lg:table-cell">
                  {product.unit ?? (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                  {formatDate(product.createdAt)}
                </td>
                <td className="px-2 py-3.5 text-muted-foreground" aria-hidden="true">
                  <span
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)]",
                      "opacity-50 transition-ui group-hover:opacity-100 group-hover:text-primary",
                    )}
                  >
                    <ChevronRightIcon className="size-4" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label="Products">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/products/${product.id}`}
              className="flex items-start gap-3 px-3 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {product.name}
                </span>
                <span className="mt-0.5 block truncate font-mono text-xs tracking-wide text-muted-foreground">
                  {product.sku}
                </span>
                <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium tabular-nums text-foreground">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  {product.unit ? (
                    <span className="text-xs text-muted-foreground">
                      / {product.unit}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    · {formatDate(product.createdAt)}
                  </span>
                </span>
              </span>
              <ChevronRightIcon
                className="mt-1 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
