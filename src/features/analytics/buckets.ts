import type { DashboardRangeDays } from "@/features/dashboard/schemas";
import type { AnalyticsBucket } from "@/server/analytics/types";

/** Bucket granularity for financial trend series. */
export function analyticsBucketForRange(
  rangeDays: DashboardRangeDays,
): AnalyticsBucket {
  return rangeDays === 90 ? "week" : "day";
}

/**
 * Align a UTC calendar date (YYYY-MM-DD) to the Monday week start (UTC).
 * Used when filling weekly buckets client-side of aggregation results.
 */
export function utcWeekStartDateOnly(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  // getUTCDay: 0=Sun … 6=Sat → Monday-based offset
  const dayOfWeek = date.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return date.toISOString().slice(0, 10);
}

/** Enumerate bucket keys from period start through end (inclusive date-only). */
export function enumerateBucketKeys(options: {
  startDateOnly: string;
  endDateOnly: string;
  bucket: AnalyticsBucket;
}): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  const [sy, sm, sd] = options.startDateOnly.split("-").map(Number);
  const [ey, em, ed] = options.endDateOnly.split("-").map(Number);
  const cursor = new Date(Date.UTC(sy!, sm! - 1, sd!));
  const end = new Date(Date.UTC(ey!, em! - 1, ed!));

  while (cursor.getTime() <= end.getTime()) {
    const dateOnly = cursor.toISOString().slice(0, 10);
    const key =
      options.bucket === "week" ? utcWeekStartDateOnly(dateOnly) : dateOnly;
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}
