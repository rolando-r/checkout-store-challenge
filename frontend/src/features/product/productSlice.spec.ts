import reducer, { productSelected, quantityChanged, productReset, type SelectedProduct } from './productSlice';

const product: SelectedProduct = {
  id: 'p1', name: 'Headphones', description: 'd', priceInCents: 1000, currency: 'COP', imageUrl: 'x.png', availableUnits: 5,
};

describe('productSlice', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({ selected: null, quantity: 1 });
  });

  it('selects a product and resets quantity to 1', () => {
    const state = reducer({ selected: null, quantity: 3 }, productSelected(product));
    expect(state.selected).toEqual(product);
    expect(state.quantity).toBe(1);
  });

  it('updates quantity', () => {
    const state = reducer({ selected: product, quantity: 1 }, quantityChanged(3));
    expect(state.quantity).toBe(3);
  });

  it('resets to initial state', () => {
    expect(reducer({ selected: product, quantity: 3 }, productReset())).toEqual({ selected: null, quantity: 1 });
  });
});