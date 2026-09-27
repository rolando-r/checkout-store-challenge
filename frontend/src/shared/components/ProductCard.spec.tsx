import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import type { ProductWithStock } from '../hooks/useProducts';

const product: ProductWithStock = {
  id: 'p1',
  name: 'Headphones',
  description: 'Great sound',
  priceInCents: 2500000,
  currency: 'COP',
  imageUrl: 'headphones.png',
  availableUnits: 11,
};

function renderCard(overrides: Partial<ProductWithStock> = {}) {
  const onBuy = jest.fn();
  render(
    <ul>
      <ProductCard product={{ ...product, ...overrides }} onBuy={onBuy} />
    </ul>,
  );
  return { onBuy };
}

describe('ProductCard', () => {
  it('renders product name, description, price and stock', () => {
    renderCard();
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('Great sound')).toBeInTheDocument();
    expect(screen.getByText('11 in stock')).toBeInTheDocument();
    expect(screen.getByText(/25\.000/)).toBeInTheDocument();
  });

  it('calls onBuy with the product and the selected quantity', async () => {
    const { onBuy } = renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pay with credit card' }));
    expect(onBuy).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 2);
  });

  it('caps the selectable quantity at the available stock', () => {
    renderCard({ availableUnits: 1 });
    const increment = screen.getByRole('button', { name: 'Increase quantity' });
    expect(increment).toBeDisabled();
  });

  it('disables buying when the product is out of stock', () => {
    renderCard({ availableUnits: 0 });
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });
});
