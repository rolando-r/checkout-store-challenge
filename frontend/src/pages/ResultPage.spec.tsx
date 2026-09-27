import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, type TestRootState } from '../test/render';
import { TransactionStatus } from '../features/payment/paymentSlice';
import { ResultPage } from './ResultPage';

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
    renderPage(basePreloadedState(TransactionStatus.Pending));

    expect(screen.getByText('Confirming your payment')).toBeInTheDocument();
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