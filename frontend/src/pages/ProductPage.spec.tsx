import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../test/render';
import { apiClient, ApiError } from '../shared/api/client';
import { ProductPage } from './ProductPage';

jest.mock('../shared/api/client', () => ({
  apiClient: { get: jest.fn() },
  ApiError: jest.requireActual('../shared/api/client').ApiError,
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const products = [
  {
    id: 'p1',
    name: 'Headphones',
    description: 'Great sound',
    priceInCents: 2500000,
    currency: 'COP',
    imageUrl: 'headphones.png',
    availableUnits: 11,
  },
];

function Checkout() {
  return <p>checkout page</p>;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<ProductPage />} />
      <Route path="/checkout" element={<Checkout />} />
    </Routes>,
  );
}

describe('ProductPage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('shows a loading state and then the product list', async () => {
    mockedGet.mockResolvedValueOnce(products);
    renderPage();

    expect(screen.getByText('Loading products…')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Headphones')).toBeInTheDocument());
  });

  it('shows an error message with a retry action', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'Products are unavailable'));
    renderPage();

    await waitFor(() => expect(screen.getByText('Products are unavailable')).toBeInTheDocument());

    mockedGet.mockResolvedValueOnce(products);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Headphones')).toBeInTheDocument());
  });

  it('shows an empty state when there are no products', async () => {
    mockedGet.mockResolvedValueOnce([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('There are no products available right now.')).toBeInTheDocument(),
    );
  });

  it('selects the product and navigates to checkout when buying', async () => {
    mockedGet.mockResolvedValueOnce(products);
    const { store } = renderPage();

    await waitFor(() => expect(screen.getByText('Headphones')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Pay with credit card' }));

    expect(screen.getByText('checkout page')).toBeInTheDocument();
    expect(store.getState().product.selected).toEqual(products[0]);
    expect(store.getState().product.quantity).toBe(1);
  });
});
