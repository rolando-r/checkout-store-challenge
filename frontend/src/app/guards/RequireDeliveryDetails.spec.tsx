import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { RequireDeliveryDetails } from './RequireDeliveryDetails';

const Protected = () => <p>protected content</p>;
const Home = () => <p>home page</p>;

const setup = (preloadedState?: Parameters<typeof renderWithProviders>[1]) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<RequireDeliveryDetails />}>
        <Route path="/summary" element={<Protected />} />
      </Route>
    </Routes>,
    { route: '/summary', ...preloadedState },
  );

describe('RequireDeliveryDetails', () => {
  it('redirects to / when no delivery address is set', () => {
    setup();
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders the protected route once delivery details exist', () => {
    setup({
      preloadedState: {
        checkout: {
          step: 'SUMMARY',
          deliveryAddress: { addressLine: 'A', city: 'B', department: 'C' },
          cardBrand: 'VISA',
          cardLast4: '4242',
          idempotencyKey: 'k1',
        },
      },
    });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});