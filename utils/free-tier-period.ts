/** UTC midnight on the 1st of the next calendar month. */
export function getFreeTierPeriodEndIso(from = new Date()): string {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1)).toISOString();
}
