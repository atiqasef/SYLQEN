import { z } from "zod";

export const DASHBOARD_RANGE_DAYS = [7, 30, 90] as const;

export type DashboardRangeDays = (typeof DASHBOARD_RANGE_DAYS)[number];

export const DASHBOARD_RANGE_LABELS: Record<DashboardRangeDays, string> = {
  7: "Last 7 days",
  30: "Last 30 days",
  90: "Last 90 days",
};

export const DEFAULT_DASHBOARD_RANGE_DAYS: DashboardRangeDays = 30;

export const dashboardRangeQuerySchema = z.object({
  range: z.coerce
    .number()
    .int()
    .optional()
    .transform((value): DashboardRangeDays => {
      if (value === 7 || value === 30 || value === 90) {
        return value;
      }
      return DEFAULT_DASHBOARD_RANGE_DAYS;
    }),
});

export type DashboardRangeQuery = z.infer<typeof dashboardRangeQuerySchema>;

/**
 * Inclusive UTC calendar window ending today.
 * start = UTC midnight of (today - (days - 1))
 * endExclusive = UTC midnight of tomorrow
 */
export function dashboardPeriodBounds(
  days: DashboardRangeDays,
  now: Date = new Date(),
): { start: Date; endExclusive: Date; startDateOnly: string; endDateOnly: string } {
  const endExclusive = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (days - 1),
    ),
  );
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  return {
    start,
    endExclusive,
    startDateOnly: start.toISOString().slice(0, 10),
    endDateOnly: endDate.toISOString().slice(0, 10),
  };
}

/** UTC calendar date for "today" comparisons (overdue). */
export function utcTodayStart(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
