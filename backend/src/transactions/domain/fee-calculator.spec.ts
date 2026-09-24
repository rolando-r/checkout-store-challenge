import { calculateQuote } from './fee-calculator';

describe('calculateQuote', () => {
  it('multiplies unit price by quantity and adds both fees', () => {
    const quote = calculateQuote(150_000_00, 2, 3_000_00, 5_000_00);
    expect(quote).toEqual({
      productAmountInCents: 300_000_00,
      baseFeeInCents: 3_000_00,
      deliveryFeeInCents: 5_000_00,
      totalAmountInCents: 308_000_00,
    });
  });

  it('handles a single unit', () => {
    const quote = calculateQuote(50_000_00, 1, 3_000_00, 5_000_00);
    expect(quote.productAmountInCents).toBe(50_000_00);
    expect(quote.totalAmountInCents).toBe(58_000_00);
  });

  it('handles zero fees', () => {
    const quote = calculateQuote(10_000_00, 1, 0, 0);
    expect(quote.totalAmountInCents).toBe(10_000_00);
  });
});