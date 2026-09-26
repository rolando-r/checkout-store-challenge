import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { RequireTransaction } from './RequireTransaction';

const Protected = () => <p>protected content</p>;
const Home = () => <p>home page</p>;

const setup = (preloadedState?: Parameters<typeof renderWithProviders>[1]) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<RequireTransaction />}>
        <Route path="/result" element={<Protected />} />
      </Route>
    </Routes>,
    { route: '/result', ...preloadedState },
  );

describe('RequireTransaction', () => {
  it('redirects to / when there is no transaction', () => {
    setup();
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders the protected route once a transaction exists', () => {
    setup({
      preloadedState: {
        payment: { transactionId: 't1', reference: 'REF-1', status: 'PENDING', statusMessage: null, totalAmountInCents: 1000 },
      },
    });
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});