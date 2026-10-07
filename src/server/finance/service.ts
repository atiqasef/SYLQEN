import "server-only";

import type { SessionContext } from "@/server/auth/types";
import { getDashboardFinancialSnapshotForSession } from "@/server/dashboard/service";
import type { DashboardFinancialSnapshot } from "@/server/dashboard/types";

/**
 * Finance module composes the existing financial intelligence snapshot.
 * No separate finance collection — workspace scoping and permissions
 * remain those of invoices.read + payments.read.
 */
export async function getFinanceSnapshotForSession(
  session: SessionContext,
  rawQuery: unknown,
  now: Date = new Date(),
): Promise<DashboardFinancialSnapshot> {
  return getDashboardFinancialSnapshotForSession(session, rawQuery, now, {
    outstandingLimit: 12,
  });
}
