import type { DashboardCurrencyMetrics } from "@/features/dashboard/money";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type DashboardKpiCardsProps = {
  metrics: DashboardCurrencyMetrics | undefined;
  currency?: string;
  multiCurrencyCount: number;
};

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

export function DashboardKpiCards({
  metrics,
  currency,
  multiCurrencyCount,
}: DashboardKpiCardsProps) {
  const code = currency ?? metrics?.currency ?? "USD";
  const cards = [
    {
      id: "total-invoiced",
      label: "Total invoiced",
      description: "Non-draft invoices issued in this period",
      value: metrics?.totalInvoiced ?? 0,
    },
    {
      id: "total-paid",
      label: "Total paid",
      description: "Payments recorded in this period",
      value: metrics?.totalPaid ?? 0,
    },
    {
      id: "outstanding",
      label: "Outstanding",
      description: "Remaining balance on period invoices",
      value: metrics?.outstanding ?? 0,
    },
    {
      id: "overdue",
      label: "Overdue",
      description: "Outstanding amount past due",
      value: metrics?.overdue ?? 0,
      emphasize: true,
    },
  ] as const;

  return (
    <section className="space-y-3" aria-labelledby="dashboard-kpi-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="dashboard-kpi-heading"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Financial overview
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Workspace totals in{" "}
            <span className="font-mono font-medium tracking-wide uppercase text-foreground">
              {code}
            </span>
            . Calculated on the server.
            {multiCurrencyCount > 1
              ? ` ${multiCurrencyCount} currencies in this period — values are not mixed.`
              : null}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.id} className="overflow-hidden">
            <CardHeader className="gap-3 p-5">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <CardDescription className="text-xs leading-5">
                  {card.description}
                </CardDescription>
              </div>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight tabular-nums text-foreground",
                  "emphasize" in card && card.emphasize && metrics && metrics.overdue > 0
                    ? "text-warning"
                    : null,
                )}
                aria-label={`${card.label}: ${formatMoney(card.value, code)}`}
              >
                {formatMoney(card.value, code)}
              </p>
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                {code}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
