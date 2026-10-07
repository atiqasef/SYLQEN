import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildFinanceActivity } from "@/features/finance/activity";
import type {
  DashboardRecentInvoice,
  DashboardRecentPayment,
} from "@/server/dashboard/types";

type FinanceActivityPanelProps = {
  payments: DashboardRecentPayment[];
  invoices: DashboardRecentInvoice[];
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

export function FinanceActivityPanel({
  payments,
  invoices,
}: FinanceActivityPanelProps) {
  const items = buildFinanceActivity({ payments, invoices, limit: 8 });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0 space-y-1">
          <CardTitle id="finance-activity-heading">
            Recent activity
          </CardTitle>
          <CardDescription>
            Latest payments and invoices in this workspace
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/payments">Payments</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">Invoices</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:px-1">
        {items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">
            No recent financial activity yet.
          </p>
        ) : (
          <ul className="divide-y divide-border" aria-label="Recent financial activity">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 transition-ui hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6"
                >
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </span>
                  {item.amount != null && item.currency ? (
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      {formatMoney(item.amount, item.currency)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
