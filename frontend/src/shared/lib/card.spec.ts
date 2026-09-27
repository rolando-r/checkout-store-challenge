import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  isValidCvc,
  isValidExpiry,
  last4,
} from './card';

describe('detectCardBrand', () => {
  it('detects Visa numbers starting with 4', () => {
    expect(detectCardBrand('4242 4242 4242 4242')).toBe('VISA');
  });

  it('detects classic Mastercard numbers in the 51-55 range', () => {
    expect(detectCardBrand('5555555555554444')).toBe('MASTERCARD');
    expect(detectCardBrand('5105105105105100')).toBe('MASTERCARD');
  });

  it('detects Mastercard numbers in the newer 2221-2720 range', () => {
    expect(detectCardBrand('2221000000000009')).toBe('MASTERCARD');
    expect(detectCardBrand('2720000000000000')).toBe('MASTERCARD');
  });

  it('returns UNKNOWN for unrecognized or incomplete numbers', () => {
    expect(detectCardBrand('1234567890123456')).toBe('UNKNOWN');
    expect(detectCardBrand('')).toBe('UNKNOWN');
  });
});

describe('isValidCardNumber', () => {
  it('accepts a Luhn-valid Visa test number', () => {
    expect(isValidCardNumber('4242424242424242')).toBe(true);
  });

  it('accepts a Luhn-valid Mastercard test number', () => {
    expect(isValidCardNumber('5555555555554444')).toBe(true);
  });

  it('rejects a number that fails the Luhn checksum', () => {
    expect(isValidCardNumber('4242424242424241')).toBe(false);
  });

  it('rejects numbers shorter than 13 or longer than 19 digits', () => {
    expect(isValidCardNumber('42424242')).toBe(false);
    expect(isValidCardNumber('4'.repeat(20))).toBe(false);
  });

  it('ignores spaces when validating', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
  });
});

describe('formatCardNumber', () => {
  it('groups digits in blocks of 4', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('strips non-digit characters before grouping', () => {
    expect(formatCardNumber('4242-4242-4242-4242')).toBe('4242 4242 4242 4242');
  });

  it('truncates to 19 digits', () => {
    expect(formatCardNumber('1'.repeat(25))).toBe('1111 1111 1111 1111 111');
  });
});

describe('formatExpiry', () => {
  it('inserts a slash after the second digit', () => {
    expect(formatExpiry('1225')).toBe('12/25');
  });

  it('leaves short input untouched', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('12')).toBe('12');
  });

  it('caps input at 4 digits', () => {
    expect(formatExpiry('122599')).toBe('12/25');
  });
});

describe('isValidExpiry', () => {
  const referenceNow = new Date('2026-06-15T00:00:00Z');

  it('accepts a future month/year', () => {
    expect(isValidExpiry('12', '26', referenceNow)).toBe(true);
  });

  it('accepts the current month', () => {
    expect(isValidExpiry('06', '26', referenceNow)).toBe(true);
  });

  it('rejects a past year', () => {
    expect(isValidExpiry('12', '25', referenceNow)).toBe(false);
  });

  it('rejects an earlier month in the current year', () => {
    expect(isValidExpiry('05', '26', referenceNow)).toBe(false);
  });

  it('rejects an invalid month', () => {
    expect(isValidExpiry('13', '27', referenceNow)).toBe(false);
    expect(isValidExpiry('00', '27', referenceNow)).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidExpiry('1', '27', referenceNow)).toBe(false);
    expect(isValidExpiry('12', '7', referenceNow)).toBe(false);
  });
});

describe('isValidCvc', () => {
  it('accepts 3 or 4 digit codes', () => {
    expect(isValidCvc('123')).toBe(true);
    expect(isValidCvc('1234')).toBe(true);
  });

  it('rejects codes of the wrong length or non-numeric input', () => {
    expect(isValidCvc('12')).toBe(false);
    expect(isValidCvc('12345')).toBe(false);
    expect(isValidCvc('abc')).toBe(false);
  });
});

describe('last4', () => {
  it('returns the last 4 digits, ignoring formatting', () => {
    expect(last4('4242 4242 4242 4242')).toBe('4242');
  });
});
