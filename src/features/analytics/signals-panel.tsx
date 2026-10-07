import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyticsSignal } from "@/server/analytics/types";

type SignalsPanelProps = {
  signals: AnalyticsSignal[];
};

export function AnalyticsSignalsPanel({ signals }: SignalsPanelProps) {
  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle id="analytics-signals-heading">Business signals</CardTitle>
        <CardDescription>
          Rule-based indicators from the selected period. Not forecasts or AI
          scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {signals.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No signals for this period. Issue invoices, record payments, or add
            projects to surface explainable alerts.
          </p>
        ) : (
          <ul className="space-y-3">
            {signals.map((signal) => (
              <li
                key={signal.id}
                className="rounded-[var(--radius-md)] border border-border px-3 py-3 sm:px-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      signal.severity === "attention" ? "warning" : "secondary"
                    }
                  >
                    {signal.severity === "attention" ? "Attention" : "Info"}
                  </Badge>
                  <p className="text-sm font-medium text-foreground">
                    {signal.title}
                  </p>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {signal.detail}
                </p>
                {signal.href ? (
                  <Link
                    href={signal.href}
                    className="mt-2 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Review
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
