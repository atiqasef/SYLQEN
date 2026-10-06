import Link from "next/link";

import { ChevronRightIcon } from "@/components/layout/icons";
import { PaymentMethodBadge } from "@/features/payments/payment-method-badge";
import type { PaymentDTO } from "@/server/payments/types";
import { cn } from "@/lib/utils/cn";

type PaymentsTableProps = {
  payments: PaymentDTO[];
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

export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
          <caption className="sr-only">Payments in your workspace</caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Payment
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Invoice
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Customer
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase xl:table-cell"
              >
                Date
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase lg:table-cell"
              >
                Method
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
              >
                Amount
              </th>
              <th scope="col" className="w-10 px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="group border-b border-border last:border-0 transition-ui hover:bg-muted/45"
              >
                <th scope="row" className="px-4 py-3.5 font-normal">
                  <Link
                    href={`/payments/${payment.id}`}
                    className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block truncate font-medium text-foreground group-hover:text-primary">
                      {payment.reference || "Payment"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground xl:hidden">
                      {formatDate(payment.paymentDate)}
                    </span>
                  </Link>
                </th>
                <td className="px-4 py-3.5">
                  <Link
                    href={`/invoices/${payment.invoiceId}`}
                    className="font-mono text-sm tracking-wide text-foreground transition-ui hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {payment.invoiceNumberSnapshot}
                  </Link>
                </td>
                <td className="hidden max-w-[12rem] truncate px-4 py-3.5 font-medium text-foreground lg:table-cell">
                  {payment.customerNameSnapshot}
                </td>
                <td className="hidden px-4 py-3.5 tabular-nums text-muted-foreground xl:table-cell">
                  {formatDate(payment.paymentDate)}
                </td>
                <td className="hidden px-4 py-3.5 lg:table-cell">
                  <PaymentMethodBadge method={payment.method} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="block font-semibold tabular-nums text-foreground">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                  <span className="mt-0.5 block text-[11px] tracking-wide text-muted-foreground uppercase">
                    {payment.currency}
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

      <ul className="divide-y divide-border md:hidden" aria-label="Payments">
        {payments.map((payment) => (
          <li key={payment.id}>
            <Link
              href={`/payments/${payment.id}`}
              className="flex items-start gap-3 px-3 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {payment.reference || "Payment"}
                  </span>
                  <PaymentMethodBadge method={payment.method} />
                </span>
                <span className="block font-mono text-sm tracking-wide text-foreground">
                  {payment.invoiceNumberSnapshot}
                </span>
                <span className="block truncate text-sm font-medium text-foreground">
                  {payment.customerNameSnapshot}
                </span>
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {payment.currency}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {formatDate(payment.paymentDate)}
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
