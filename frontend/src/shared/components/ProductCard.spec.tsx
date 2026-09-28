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

  it('caps the selectable quantity at the per-order limit even when more stock is available', async () => {
    // 11 units in stock, but the backend rejects any order over
    // MAX_QUANTITY_PER_ORDER (5) — the stepper must stop there too, or the
    // customer only finds out after filling in all their checkout details.
    renderCard({ availableUnits: 11 });
    const increment = screen.getByRole('button', { name: 'Increase quantity' });

    for (let i = 0; i < 4; i++) {
      await userEvent.click(increment);
    }

    expect(screen.getByTestId('quantity-value')).toHaveTextContent('5');
    expect(increment).toBeDisabled();
  });

  it('lazy-loads the product image by default', () => {
    renderCard();
    expect(screen.getByAltText('Headphones')).toHaveAttribute('loading', 'lazy');
  });

  it('loads the image eagerly when the card is flagged as priority', () => {
    const onBuy = jest.fn();
    render(
      <ul>
        <ProductCard product={product} onBuy={onBuy} priority />
      </ul>,
    );
    const img = screen.getByAltText('Headphones');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('disables buying when the product is out of stock', () => {
    renderCard({ availableUnits: 0 });
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });
});
