import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsProductRank } from "@/server/analytics/types";

type ProductInsightsProps = {
  currency?: string;
  topByInvoiced: AnalyticsProductRank[];
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

export function AnalyticsProductInsights({
  currency,
  topByInvoiced,
}: ProductInsightsProps) {
  const code = currency ?? "—";

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle id="analytics-products-heading">
              Product insights
            </CardTitle>
            <CardDescription>
              Ranked from invoice line-item snapshots in {code} — not live
              catalog prices.
            </CardDescription>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            All products
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {topByInvoiced.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No product line items on non-draft invoices in this period for{" "}
            {code}.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-2 py-2 font-medium">Product</th>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium text-right">Qty</th>
                    <th className="px-2 py-2 font-medium text-right">
                      Invoiced
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topByInvoiced.map((row) => (
                    <tr key={row.productId}>
                      <td className="px-2 py-2.5">
                        <Link
                          href={`/products/${row.productId}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {row.productName}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 font-mono text-xs text-muted-foreground">
                        {row.sku}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                        {formatMoney(row.invoiced, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked rows */}
            <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border md:hidden">
              {topByInvoiced.map((row) => (
                <li key={row.productId} className="space-y-1 px-3 py-3">
                  <Link
                    href={`/products/${row.productId}`}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {row.productName}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.sku} · qty {row.quantity}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-foreground">
                    {formatMoney(row.invoiced, row.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
