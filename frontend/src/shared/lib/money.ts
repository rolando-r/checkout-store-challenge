/**
 * Formats an amount stored in cents into a localized currency string.
 * e.g. formatMoney(2500000, 'COP') -> "$25.000"
 */
export function formatMoney(amountInCents: number, currency: string): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
