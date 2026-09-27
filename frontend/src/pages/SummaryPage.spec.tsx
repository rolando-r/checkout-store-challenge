import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, type TestRootState } from '../test/render';
import { apiClient, ApiError } from '../shared/api/client';
import { SummaryPage } from './SummaryPage';

jest.mock('../shared/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  ApiError: jest.requireActual('../shared/api/client').ApiError,
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const checkoutConfig = {
  currency: 'COP',
  baseFeeInCents: 300000,
  deliveryFeeInCents: 500000,
  gateway: { publicKey: 'pub_stagtest_123', acceptanceToken: 'accept_token_123' },
};

const selectedProduct = {
  id: 'p1',
  name: 'Headphones',
  description: 'Great sound',
  priceInCents: 2500000,
  currency: 'COP',
  imageUrl: 'headphones.png',
  availableUnits: 11,
};

const preloadedState: Partial<TestRootState> = {
  product: { selected: selectedProduct, quantity: 2 },
  customer: { id: 'cust_1', fullName: 'Jane Doe', email: 'jane@example.com', phone: '3001234567' },
  checkout: {
    step: 'SUMMARY',
    deliveryAddress: { addressLine: 'Calle 10 # 5-30', city: 'Bogotá', department: 'Cundinamarca' },
    cardBrand: 'VISA',
    cardLast4: '4242',
    idempotencyKey: 'idem-key-1',
  },
};

function Result() {
  return <p>result page</p>;
}

function renderPage(handoff?: { cardToken: string; acceptanceToken: string }) {
  // MemoryRouter's initialEntries also accepts { pathname, state } objects,
  // which is how CheckoutPage hands the single-use card token over via
  // navigate('/summary', { state: ... }) instead of persisted state.
  const route = handoff ? ({ pathname: '/summary', state: handoff } as unknown as string) : '/summary';

  return renderWithProviders(
    <Routes>
      <Route path="/summary" element={<SummaryPage />} />
      <Route path="/result" element={<Result />} />
    </Routes>,
    { route, preloadedState },
  );
}

const transactionResponse = {
  id: 'txn_1',
  reference: 'ref_1',
  status: 'PENDING',
  statusMessage: null,
  amounts: {
    productAmountInCents: 5000000,
    baseFeeInCents: 300000,
    deliveryFeeInCents: 500000,
    totalAmountInCents: 5800000,
    currency: 'COP',
  },
};

describe('SummaryPage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedGet.mockResolvedValue(checkoutConfig);
  });

  it('shows the product, delivery, card and fee breakdown', async () => {
    renderPage();

    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('Qty 2')).toBeInTheDocument();
    expect(screen.getByText('Calle 10 # 5-30')).toBeInTheDocument();
    expect(screen.getByText('Bogotá, Cundinamarca')).toBeInTheDocument();
    expect(screen.getByText('VISA ending in 4242')).toBeInTheDocument();

    // productAmount 5,000,000c + baseFee 300,000c + deliveryFee 500,000c = 5,800,000c -> "$58.000"
    // (Intl.NumberFormat may render a space between the symbol and the amount depending on ICU data.)
    await waitFor(() => expect(screen.getByText(/^\$\s?58\.000$/)).toBeInTheDocument());
    expect(screen.getByText(/^\$\s?3\.000$/)).toBeInTheDocument();
    expect(screen.getByText(/^\$\s?5\.000$/)).toBeInTheDocument();
  });

  it('disables payment and prompts to go back when the card handoff is missing', async () => {
    renderPage();

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/checkout/config'));
    expect(
      screen.getByText('We lost your card details after a refresh. Please go back and enter your payment info again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$/ })).toBeDisabled();
  });

  it('creates the transaction, charges it and navigates to the result page', async () => {
    mockedPost.mockResolvedValueOnce(transactionResponse);
    mockedPost.mockResolvedValueOnce({ ...transactionResponse, status: 'APPROVED', statusMessage: 'Approved' });

    const { store } = renderPage({ cardToken: 'tok_1', acceptanceToken: 'accept_token_123' });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/checkout/config'));
    const payButton = screen.getByRole('button', { name: /Pay \$/ });
    expect(payButton).toBeEnabled();

    await userEvent.click(payButton);

    await waitFor(() => expect(screen.getByText('result page')).toBeInTheDocument());

    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      '/transactions',
      {
        productId: 'p1',
        customerId: 'cust_1',
        quantity: 2,
        deliveryAddress: { addressLine: 'Calle 10 # 5-30', city: 'Bogotá', department: 'Cundinamarca' },
      },
      { 'Idempotency-Key': 'idem-key-1' },
    );
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/transactions/txn_1/payment', {
      cardToken: 'tok_1',
      acceptanceToken: 'accept_token_123',
      installments: 1,
    });
    expect(store.getState().payment.status).toBe('APPROVED');
    expect(store.getState().payment.transactionId).toBe('txn_1');
  });

  it('shows an inline error when the payment call fails', async () => {
    mockedPost.mockResolvedValueOnce(transactionResponse);
    mockedPost.mockRejectedValueOnce(new ApiError(422, 'GATEWAY_DECLINED', 'The payment was declined'));

    renderPage({ cardToken: 'tok_1', acceptanceToken: 'accept_token_123' });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/checkout/config'));
    const payButton = screen.getByRole('button', { name: /Pay \$/ });
    await userEvent.click(payButton);

    expect(await screen.findByText('The payment was declined')).toBeInTheDocument();
  });
});