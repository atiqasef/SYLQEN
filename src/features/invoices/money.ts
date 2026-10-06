/** Convert a decimal money amount to integer cents. */
export function moneyToCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert integer cents to a decimal money amount. */
export function centsToMoney(cents: number): number {
  return cents / 100;
}

/** quantity × unitPrice using integer cents to reduce float error. */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return centsToMoney(moneyToCents(unitPrice) * quantity);
}

/** Sum line totals using integer cents. */
export function sumMoney(amounts: number[]): number {
  const totalCents = amounts.reduce(
    (sum, amount) => sum + moneyToCents(amount),
    0,
  );
  return centsToMoney(totalCents);
}
