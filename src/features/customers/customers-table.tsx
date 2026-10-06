import Link from "next/link";

import { ChevronRightIcon } from "@/components/layout/icons";
import type { CustomerDTO } from "@/server/customers/types";
import { cn } from "@/lib/utils/cn";

type CustomersTableProps = {
  customers: CustomerDTO[];
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

export function CustomersTable({ customers }: CustomersTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Customers in your workspace</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Customer
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Company
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Phone
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
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="group border-b border-border last:border-0 transition-ui hover:bg-muted/45"
              >
                <th scope="row" className="px-4 py-3.5 font-normal">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block truncate font-medium text-foreground group-hover:text-primary">
                      {customer.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:text-sm">
                      {customer.email}
                    </span>
                  </Link>
                </th>
                <td className="max-w-[12rem] truncate px-4 py-3.5 text-muted-foreground">
                  {customer.company ?? (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="hidden max-w-[10rem] truncate px-4 py-3.5 text-muted-foreground lg:table-cell">
                  {customer.phone ?? (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                  {formatDate(customer.createdAt)}
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

      <ul className="divide-y divide-border md:hidden" aria-label="Customers">
        {customers.map((customer) => (
          <li key={customer.id}>
            <Link
              href={`/customers/${customer.id}`}
              className="flex items-start gap-3 px-3 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {customer.name}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {customer.email}
                </span>
                {(customer.company || customer.phone) && (
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {[customer.company, customer.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
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
