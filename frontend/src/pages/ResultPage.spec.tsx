import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, type TestRootState } from '../test/render';
import { TransactionStatus } from '../features/payment/paymentSlice';
import { ResultPage } from './ResultPage';

function mockFetchOnce(body: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

const selectedProduct = {
  id: 'p1',
  name: 'Headphones',
  description: 'Great sound',
  priceInCents: 2500000,
  currency: 'COP',
  imageUrl: 'headphones.png',
  availableUnits: 11,
};

function basePreloadedState(status: TransactionStatus, statusMessage: string | null = null): Partial<TestRootState> {
  return {
    product: { selected: selectedProduct, quantity: 2 },
    checkout: {
      step: 'RESULT',
      deliveryAddress: { addressLine: 'Calle 10 # 5-30', city: 'Bogotá', department: 'Cundinamarca' },
      cardBrand: 'VISA',
      cardLast4: '4242',
      idempotencyKey: 'idem-key-1',
    },
    payment: {
      transactionId: 'txn_1',
      reference: 'ref_1',
      status,
      statusMessage,
      totalAmountInCents: 5800000,
    },
  };
}

function Store() {
  return <p>store page</p>;
}

function renderPage(preloadedState: Partial<TestRootState>) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Store />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>,
    { route: '/result', preloadedState },
  );
}

describe('ResultPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('renders the approved state with the reference and amount', () => {
    renderPage(basePreloadedState(TransactionStatus.Approved, 'Transaction approved'));

    expect(screen.getByText('Payment approved')).toBeInTheDocument();
    expect(screen.getByText('Transaction approved')).toBeInTheDocument();
    expect(screen.getByText('ref_1')).toBeInTheDocument();
    expect(screen.getByText(/^\$\s?58\.000$/)).toBeInTheDocument();
    expect(screen.getByText('Headphones')).toBeInTheDocument();
  });

  it('renders the declined state', () => {
    renderPage(basePreloadedState(TransactionStatus.Declined));

    expect(screen.getByText('Payment declined')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    renderPage(basePreloadedState(TransactionStatus.Error));

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders the pending state', () => {
    global.fetch = mockFetchOnce({ status: TransactionStatus.Pending, statusMessage: null });

    renderPage(basePreloadedState(TransactionStatus.Pending));

    expect(screen.getByText('Confirming your payment')).toBeInTheDocument();
  });

  it('reconciles a stale PENDING status with the backend on mount, so a refresh mid-payment resolves', async () => {
    global.fetch = mockFetchOnce({ status: TransactionStatus.Approved, statusMessage: 'Transaction approved' });

    renderPage(basePreloadedState(TransactionStatus.Pending));

    // The persisted state says PENDING (e.g. the client refreshed right after
    // the transaction was created), but the backend now knows it settled.
    await waitFor(() => expect(screen.getByText('Payment approved')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transactions/txn_1'),
      expect.any(Object),
    );
  });

  it('does not call the backend when the status is already final', () => {
    global.fetch = mockFetchOnce({ status: TransactionStatus.Approved, statusMessage: null });

    renderPage(basePreloadedState(TransactionStatus.Approved));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears the checkout session and returns to the store on continue', async () => {
    const user = userEvent.setup();
    const { store } = renderPage(basePreloadedState(TransactionStatus.Approved));

    await user.click(screen.getByRole('button', { name: /back to store/i }));

    expect(screen.getByText('store page')).toBeInTheDocument();
    const state = store.getState();
    expect(state.product.selected).toBeNull();
    expect(state.checkout.deliveryAddress).toBeNull();
    expect(state.payment.transactionId).toBeNull();
  });
});
