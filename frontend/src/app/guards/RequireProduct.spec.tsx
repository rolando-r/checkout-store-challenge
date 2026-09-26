import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { RequireProduct } from './RequireProduct';

const Protected = () => <p>protected content</p>;
const Home = () => <p>home page</p>;

const setup = (preloadedState?: Parameters<typeof renderWithProviders>[1]) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<RequireProduct />}>
        <Route path="/checkout" element={<Protected />} />
      </Route>
    </Routes>,
    { route: '/checkout', ...preloadedState },
  );

describe('RequireProduct', () => {
  it('redirects to / when no product is selected', () => {
    setup();
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders the protected route when a product is selected', () => {
    setup({
      preloadedState: {
        product: { selected: { id: 'p1', name: 'x', description: 'd', priceInCents: 1, currency: 'COP', imageUrl: '', availableUnits: 1 }, quantity: 1 },
      },
    });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});