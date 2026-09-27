import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats whole COP amounts without decimals, grouped by thousands', () => {
    const result = formatMoney(2500000, 'COP');
    expect(result).toContain('25.000');
    expect(result).toMatch(/\$/);
  });

  it('rounds cents down to the nearest currency unit (no decimals shown)', () => {
    const result = formatMoney(1099, 'COP');
    expect(result).toContain('11');
    expect(result).not.toMatch(/[.,]\d{2}(\D|$)/);
  });

  it('formats zero as a valid amount', () => {
    const result = formatMoney(0, 'COP');
    expect(result).toContain('0');
  });
});
