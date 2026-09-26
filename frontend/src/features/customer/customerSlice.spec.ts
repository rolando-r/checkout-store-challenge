import reducer, { customerSaved, customerReset } from './customerSlice';

describe('customerSlice', () => {
  const initial = { id: null, fullName: '', email: '', phone: '' };

  it('returns the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('saves a customer', () => {
    const payload = { id: 'c1', fullName: 'Ana', email: 'ana@example.com', phone: '3001234567' };
    expect(reducer(initial, customerSaved(payload))).toEqual(payload);
  });

  it('resets', () => {
    const filled = { id: 'c1', fullName: 'Ana', email: 'ana@example.com', phone: '3001234567' };
    expect(reducer(filled, customerReset())).toEqual(initial);
  });
});