import Link from "next/link";

import { ChevronRightIcon } from "@/components/layout/icons";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import type { InvoiceDTO } from "@/server/invoices/types";
import { cn } from "@/lib/utils/cn";

type InvoicesTableProps = {
  invoices: InvoiceDTO[];
};

function formatDate(value: string) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year!, month! - 1, day!)));
  } catch {
    return value;
  }
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Invoices in your workspace</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Invoice
              </th>
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
                Status
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Issued
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase xl:table-cell"
              >
                Due
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Total
              </th>
              <th scope="col" className="w-10 px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="group border-b border-border last:border-0 transition-ui hover:bg-muted/45"
              >
                <th scope="row" className="px-4 py-3.5 font-normal">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block truncate font-mono text-sm font-medium tracking-wide text-foreground group-hover:text-primary">
                      {invoice.invoiceNumber}
                    </span>
                  </Link>
                </th>
                <td className="max-w-[12rem] px-4 py-3.5">
                  <span className="block truncate font-medium text-foreground">
                    {invoice.customerNameSnapshot}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="hidden px-4 py-3.5 tabular-nums text-muted-foreground lg:table-cell">
                  {formatDate(invoice.issueDate)}
                </td>
                <td className="hidden px-4 py-3.5 tabular-nums text-muted-foreground xl:table-cell">
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="block font-semibold tabular-nums text-foreground">
                    {formatMoney(invoice.total, invoice.currency)}
                  </span>
                  <span className="mt-0.5 block text-[11px] tracking-wide text-muted-foreground uppercase">
                    {invoice.currency}
                  </span>
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

      <ul className="divide-y divide-border md:hidden" aria-label="Invoices">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link
              href={`/invoices/${invoice.id}`}
              className="flex items-start gap-3 px-3 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium tracking-wide text-foreground">
                    {invoice.invoiceNumber}
                  </span>
                  <InvoiceStatusBadge status={invoice.status} />
                </span>
                <span className="block truncate text-sm font-medium text-foreground">
                  {invoice.customerNameSnapshot}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Issued {formatDate(invoice.issueDate)}
                  <span className="mx-1.5 text-border" aria-hidden="true">
                    ·
                  </span>
                  Due {formatDate(invoice.dueDate)}
                </span>
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(invoice.total, invoice.currency)}
                  </span>
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {invoice.currency}
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
