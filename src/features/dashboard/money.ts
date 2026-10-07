import { centsToMoney, moneyToCents } from "@/features/invoices/money";

export type CurrencyMoney = {
  currency: string;
  amount: number;
};

export type DashboardCurrencyMetrics = {
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
};

/** Pick the currency with the largest invoiced cents (stable tie-break by code). */
export function pickPrimaryCurrency(
  metrics: DashboardCurrencyMetrics[],
): string | undefined {
  if (metrics.length === 0) {
    return undefined;
  }

  return [...metrics].sort((a, b) => {
    const diff = moneyToCents(b.totalInvoiced) - moneyToCents(a.totalInvoiced);
    if (diff !== 0) {
      return diff;
    }
    return a.currency.localeCompare(b.currency);
  })[0]!.currency;
}

export function mergeCurrencyMetrics(
  rows: Array<{
    currency: string;
    totalInvoicedCents?: number;
    totalPaidCents?: number;
    outstandingCents?: number;
    overdueCents?: number;
  }>,
): DashboardCurrencyMetrics[] {
  const map = new Map<string, DashboardCurrencyMetrics>();

  for (const row of rows) {
    const currency = row.currency;
    const current = map.get(currency) ?? {
      currency,
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      overdue: 0,
    };

    if (row.totalInvoicedCents != null) {
      current.totalInvoiced = centsToMoney(
        moneyToCents(current.totalInvoiced) + row.totalInvoicedCents,
      );
    }
    if (row.totalPaidCents != null) {
      current.totalPaid = centsToMoney(
        moneyToCents(current.totalPaid) + row.totalPaidCents,
      );
    }
    if (row.outstandingCents != null) {
      current.outstanding = centsToMoney(
        moneyToCents(current.outstanding) + row.outstandingCents,
      );
    }
    if (row.overdueCents != null) {
      current.overdue = centsToMoney(
        moneyToCents(current.overdue) + row.overdueCents,
      );
    }

    map.set(currency, current);
  }

  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/** remaining = max(0, total - paid) using integer cents. */
export function remainingFromTotals(total: number, paid: number): number {
  return Math.max(0, centsToMoney(moneyToCents(total) - moneyToCents(paid)));
}
