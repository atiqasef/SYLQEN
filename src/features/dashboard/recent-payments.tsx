import Link from "next/link";

import { PaymentMethodBadge } from "@/features/payments/payment-method-badge";
import type { DashboardRecentPayment } from "@/server/dashboard/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RecentPaymentsProps = {
  payments: DashboardRecentPayment[];
};

function formatDate(value: string) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
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

export function RecentPaymentsPanel({ payments }: RecentPaymentsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1">
          <CardTitle>Recent payments</CardTitle>
          <CardDescription>Latest recorded payments in this workspace</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/payments">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {payments.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-border" aria-label="Recent payments">
            {payments.map((payment) => (
              <li key={payment.id}>
                <Link
                  href={`/payments/${payment.id}`}
                  aria-label={`View payment ${formatMoney(payment.amount, payment.currency)} for ${payment.invoiceNumberSnapshot}`}
                  className="flex items-start justify-between gap-3 px-5 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6"
                >
                  <span className="min-w-0 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(payment.amount, payment.currency)}
                      </span>
                      <PaymentMethodBadge method={payment.method} />
                    </span>
                    <span className="block font-mono text-xs tracking-wide text-muted-foreground">
                      {payment.invoiceNumberSnapshot}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {payment.customerNameSnapshot}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDate(payment.paymentDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
