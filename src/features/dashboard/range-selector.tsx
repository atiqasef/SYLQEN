import Link from "next/link";

import {
  DASHBOARD_RANGE_DAYS,
  DASHBOARD_RANGE_LABELS,
  type DashboardRangeDays,
} from "@/features/dashboard/schemas";
import { cn } from "@/lib/utils/cn";

type DashboardRangeSelectorProps = {
  rangeDays: DashboardRangeDays;
};

export function DashboardRangeSelector({
  rangeDays,
}: DashboardRangeSelectorProps) {
  return (
    <nav
      aria-label="Dashboard date range"
      className="flex flex-wrap items-center gap-1.5"
    >
      {DASHBOARD_RANGE_DAYS.map((days) => {
        const active = days === rangeDays;
        const href = days === 30 ? "/" : `/?range=${days}`;
        return (
          <Link
            key={days}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-medium transition-ui",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {DASHBOARD_RANGE_LABELS[days]}
          </Link>
        );
      })}
    </nav>
  );
}
