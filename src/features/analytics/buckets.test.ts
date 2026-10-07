import { describe, expect, it } from "vitest";

import {
  analyticsBucketForRange,
  enumerateBucketKeys,
  utcWeekStartDateOnly,
} from "@/features/analytics/buckets";

describe("analytics buckets", () => {
  it("uses daily buckets for 7 and 30 days, weekly for 90", () => {
    expect(analyticsBucketForRange(7)).toBe("day");
    expect(analyticsBucketForRange(30)).toBe("day");
    expect(analyticsBucketForRange(90)).toBe("week");
  });

  it("aligns UTC dates to Monday week starts", () => {
    // 2026-03-15 is Sunday → week starts 2026-03-09 (Monday)
    expect(utcWeekStartDateOnly("2026-03-15")).toBe("2026-03-09");
    // 2026-03-09 is Monday
    expect(utcWeekStartDateOnly("2026-03-09")).toBe("2026-03-09");
    // 2026-03-11 is Wednesday
    expect(utcWeekStartDateOnly("2026-03-11")).toBe("2026-03-09");
  });

  it("enumerates daily keys inclusively in UTC", () => {
    expect(
      enumerateBucketKeys({
        startDateOnly: "2026-03-14",
        endDateOnly: "2026-03-16",
        bucket: "day",
      }),
    ).toEqual(["2026-03-14", "2026-03-15", "2026-03-16"]);
  });

  it("enumerates unique weekly keys", () => {
    const keys = enumerateBucketKeys({
      startDateOnly: "2026-03-09",
      endDateOnly: "2026-03-20",
      bucket: "week",
    });
    expect(keys).toEqual(["2026-03-09", "2026-03-16"]);
  });
});
