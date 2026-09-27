export type CardBrand = 'VISA' | 'MASTERCARD' | 'UNKNOWN';

/**
 * Detects the card network from its leading digits (IIN ranges).
 * Visa: starts with 4.
 * Mastercard: 51-55, or the newer 2221-2720 range.
 */
export function detectCardBrand(rawNumber: string): CardBrand {
  const digits = onlyDigits(rawNumber);
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'MASTERCARD';
  return 'UNKNOWN';
}

/** Luhn checksum + length check (13-19 digits, per ISO/IEC 7812). */
export function isValidCardNumber(rawNumber: string): boolean {
  const digits = onlyDigits(rawNumber);
  if (digits.length < 13 || digits.length > 19) return false;
  return luhnCheck(digits);
}

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/** Groups digits in 4s for display: "4242424242424242" -> "4242 4242 4242 4242". */
export function formatCardNumber(rawNumber: string): string {
  return onlyDigits(rawNumber).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

/** Formats free-typed digits into "MM/YY", inserting the slash as the user types. */
export function formatExpiry(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Validates a 2-digit month and 2-digit year, rejecting anything already expired. */
export function isValidExpiry(month: string, year: string, now: Date = new Date()): boolean {
  if (!/^\d{2}$/.test(month) || !/^\d{2}$/.test(year)) return false;
  const monthNumber = Number(month);
  if (monthNumber < 1 || monthNumber > 12) return false;

  const fullYear = 2000 + Number(year);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && monthNumber < currentMonth) return false;
  return true;
}

export function isValidCvc(rawValue: string): boolean {
  return /^\d{3,4}$/.test(rawValue);
}

export function last4(rawNumber: string): string {
  return onlyDigits(rawNumber).slice(-4);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
