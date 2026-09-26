import reducer, { stepChanged, deliveryDetailsSubmitted, checkoutReset, CheckoutStep } from './checkoutSlice';

const initial = {
  step: CheckoutStep.Product, deliveryAddress: null, cardBrand: null, cardLast4: null, idempotencyKey: null,
};

describe('checkoutSlice', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('changes step', () => {
    expect(reducer(initial, stepChanged(CheckoutStep.Summary)).step).toBe(CheckoutStep.Summary);
  });

  it('stores delivery details, generates an idempotency key, and advances to Summary', () => {
    const state = reducer(
      initial,
      deliveryDetailsSubmitted({
        address: { addressLine: 'Calle 10', city: 'Aguachica', department: 'Cesar' },
        cardBrand: 'VISA',
        cardLast4: '4242',
      }),
    );
    expect(state.deliveryAddress).toEqual({ addressLine: 'Calle 10', city: 'Aguachica', department: 'Cesar' });
    expect(state.cardBrand).toBe('VISA');
    expect(state.idempotencyKey).toEqual(expect.any(String));
    expect(state.step).toBe(CheckoutStep.Summary);
  });

  it('resets', () => {
    const filled = reducer(
      initial,
      deliveryDetailsSubmitted({
        address: { addressLine: 'A', city: 'B', department: 'C' },
        cardBrand: 'VISA',
        cardLast4: '1111',
      }),
    );
    expect(reducer(filled, checkoutReset())).toEqual(initial);
  });
});