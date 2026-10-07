import { centsToMoney, moneyToCents, sumMoney } from "@/features/invoices/money";
import type { DashboardPaymentTrendPoint } from "@/server/dashboard/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PaymentTrendChartProps = {
  points: DashboardPaymentTrendPoint[];
  currency: string;
  periodLabel: string;
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

function formatShortDate(value: string) {
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

/** Accessible SVG bar chart — no external chart library. */
export function PaymentTrendChart({
  points,
  currency,
  periodLabel,
}: PaymentTrendChartProps) {
  const maxCents = Math.max(
    ...points.map((point) => moneyToCents(point.amount)),
    0,
  );
  const max = centsToMoney(maxCents);
  const chartHeight = 160;
  const barGap = 4;
  const width = Math.max(points.length * 28, 280);
  const barWidth =
    points.length > 0
      ? Math.max(8, (width - barGap * (points.length + 1)) / points.length)
      : 8;

  const total = sumMoney(points.map((point) => point.amount));

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle>Payment revenue</CardTitle>
        <CardDescription>
          Recorded payments in {currency} over {periodLabel.toLowerCase()}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {points.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No payments recorded in this period.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <svg
                role="img"
                aria-label={`Payment revenue chart for ${periodLabel} in ${currency}. Total ${formatMoney(total, currency)}.`}
                viewBox={`0 0 ${width} ${chartHeight + 28}`}
                className="h-48 w-full min-w-[16rem] text-primary"
              >
                <title>Payment revenue trend</title>
                {points.map((point, index) => {
                  const height =
                    max > 0 ? (point.amount / max) * (chartHeight - 8) : 0;
                  const x = barGap + index * (barWidth + barGap);
                  const y = chartHeight - height;
                  return (
                    <g key={point.date}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(height, point.amount > 0 ? 2 : 0)}
                        rx={2}
                        className="fill-current opacity-80"
                      >
                        <title>
                          {formatShortDate(point.date)}:{" "}
                          {formatMoney(point.amount, currency)}
                        </title>
                      </rect>
                    </g>
                  );
                })}
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              Period total{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(total, currency)}
              </span>
            </p>
            <ul className="sr-only">
              {points.map((point) => (
                <li key={point.date}>
                  {point.date}: {formatMoney(point.amount, currency)}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
