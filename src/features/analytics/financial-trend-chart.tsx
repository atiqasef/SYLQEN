import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { moneyToCents } from "@/features/invoices/money";
import type { AnalyticsBucket, AnalyticsFinancialTrendPoint } from "@/server/analytics/types";

type FinancialTrendChartProps = {
  points: AnalyticsFinancialTrendPoint[];
  currency?: string;
  bucket: AnalyticsBucket;
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

function formatBucketLabel(value: string, bucket: AnalyticsBucket) {
  try {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    if (bucket === "week") {
      return `Week of ${new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date)}`;
    }
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return value;
  }
}

/** Dual-series SVG bars: invoiced vs paid for the primary currency. */
export function AnalyticsFinancialTrendChart({
  points,
  currency,
  bucket,
  periodLabel,
}: FinancialTrendChartProps) {
  const code = currency ?? "USD";
  const maxCents = Math.max(
    ...points.flatMap((point) => [
      moneyToCents(point.invoiced),
      moneyToCents(point.paid),
    ]),
    0,
  );
  const max = maxCents / 100;
  const chartHeight = 168;
  const groupGap = 6;
  const pairGap = 2;
  const width = Math.max(points.length * 36, 280);
  const groupWidth =
    points.length > 0
      ? Math.max(14, (width - groupGap * (points.length + 1)) / points.length)
      : 14;
  const barWidth = Math.max(5, (groupWidth - pairGap) / 2);

  const hasSeries = points.some(
    (point) => point.invoiced > 0 || point.paid > 0,
  );

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle id="analytics-trend-heading">Invoiced vs paid</CardTitle>
        <CardDescription>
          {code} totals by {bucket === "week" ? "week" : "day"} over{" "}
          {periodLabel.toLowerCase()}. Currencies are never mixed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {!currency || !hasSeries ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No invoiced or paid activity in this period for a primary currency.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm bg-primary/80"
                  aria-hidden
                />
                Invoiced
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm bg-foreground/55"
                  aria-hidden
                />
                Paid
              </span>
            </div>
            <div className="overflow-x-auto">
              <svg
                role="img"
                aria-label={`Invoiced versus paid chart for ${periodLabel} in ${code}.`}
                viewBox={`0 0 ${width} ${chartHeight + 28}`}
                className="h-52 w-full min-w-[16rem]"
              >
                <title>Invoiced vs paid trend</title>
                {points.map((point, index) => {
                  const groupX = groupGap + index * (groupWidth + groupGap);
                  const invoicedHeight =
                    max > 0 ? (point.invoiced / max) * (chartHeight - 8) : 0;
                  const paidHeight =
                    max > 0 ? (point.paid / max) * (chartHeight - 8) : 0;
                  return (
                    <g key={point.bucket}>
                      <rect
                        x={groupX}
                        y={chartHeight - invoicedHeight}
                        width={barWidth}
                        height={Math.max(
                          invoicedHeight,
                          point.invoiced > 0 ? 2 : 0,
                        )}
                        rx={2}
                        className="fill-primary opacity-80"
                      >
                        <title>
                          {formatBucketLabel(point.bucket, bucket)} invoiced:{" "}
                          {formatMoney(point.invoiced, code)}
                        </title>
                      </rect>
                      <rect
                        x={groupX + barWidth + pairGap}
                        y={chartHeight - paidHeight}
                        width={barWidth}
                        height={Math.max(paidHeight, point.paid > 0 ? 2 : 0)}
                        rx={2}
                        className="fill-foreground opacity-55"
                      >
                        <title>
                          {formatBucketLabel(point.bucket, bucket)} paid:{" "}
                          {formatMoney(point.paid, code)}
                        </title>
                      </rect>
                    </g>
                  );
                })}
              </svg>
            </div>
            <ul className="sr-only">
              {points.map((point) => (
                <li key={point.bucket}>
                  {point.bucket}: invoiced {formatMoney(point.invoiced, code)},
                  paid {formatMoney(point.paid, code)}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
