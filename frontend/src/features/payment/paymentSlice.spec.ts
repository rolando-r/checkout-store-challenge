import reducer, { transactionCreated, transactionStatusUpdated, paymentReset, TransactionStatus } from './paymentSlice';

const initial = { transactionId: null, reference: null, status: null, statusMessage: null, totalAmountInCents: null };

describe('paymentSlice', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('records a created transaction as PENDING', () => {
    const state = reducer(initial, transactionCreated({ id: 't1', reference: 'REF-1', totalAmountInCents: 100000 }));
    expect(state).toEqual({
      transactionId: 't1', reference: 'REF-1', totalAmountInCents: 100000,
      status: TransactionStatus.Pending, statusMessage: null,
    });
  });

  it('updates status', () => {
    const withTxn = reducer(initial, transactionCreated({ id: 't1', reference: 'REF-1', totalAmountInCents: 100000 }));
    const state = reducer(withTxn, transactionStatusUpdated({ status: TransactionStatus.Approved, statusMessage: 'Approved' }));
    expect(state.status).toBe(TransactionStatus.Approved);
    expect(state.statusMessage).toBe('Approved');
  });

  it('resets', () => {
    const withTxn = reducer(initial, transactionCreated({ id: 't1', reference: 'REF-1', totalAmountInCents: 100000 }));
    expect(reducer(withTxn, paymentReset())).toEqual(initial);
  });
});