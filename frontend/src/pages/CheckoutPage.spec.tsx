import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../test/render';
import { apiClient, ApiError } from '../shared/api/client';
import { tokenizeCard, WompiError } from '../shared/api/wompi';
import { CheckoutPage } from './CheckoutPage';

jest.mock('../shared/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  ApiError: jest.requireActual('../shared/api/client').ApiError,
}));

jest.mock('../shared/api/wompi', () => ({
  tokenizeCard: jest.fn(),
  WompiError: jest.requireActual('../shared/api/wompi').WompiError,
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockedTokenize = tokenizeCard as jest.MockedFunction<typeof tokenizeCard>;

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

function Summary() {
  return <p>summary page</p>;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/summary" element={<Summary />} />
    </Routes>,
    {
      route: '/checkout',
      preloadedState: { product: { selected: selectedProduct, quantity: 2 } },
    },
  );
}

async function fillValidForm() {
  await userEvent.type(screen.getByPlaceholderText('Jane Doe'), 'Jane Doe');
  await userEvent.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com');
  await userEvent.type(screen.getByPlaceholderText('3001234567'), '3001234567');
  await userEvent.type(screen.getByPlaceholderText('Calle 10 # 5-30, Apt 201'), 'Calle 10 # 5-30');
  await userEvent.type(screen.getByPlaceholderText('Bogotá'), 'Bogotá');
  await userEvent.type(screen.getByPlaceholderText('Cundinamarca'), 'Cundinamarca');
  await userEvent.type(screen.getByPlaceholderText('As it appears on the card'), 'Jane Doe');
  await userEvent.type(screen.getByPlaceholderText('4242 4242 4242 4242'), '4242424242424242');
  await userEvent.type(screen.getByPlaceholderText('12/28'), '1230');
  await userEvent.type(screen.getByPlaceholderText('123'), '123');
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedTokenize.mockReset();
    mockedGet.mockResolvedValue(checkoutConfig);
  });

  it('shows the order recap for the selected product and quantity', async () => {
    renderPage();
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('Qty 2')).toBeInTheDocument();
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/checkout/config'));
  });

  it('shows validation errors and does not submit when required fields are missing', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Continue to summary' }));

    expect(await screen.findByText('Enter the full name (at least 3 characters).')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid card number.')).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('detects the Visa brand as the card number is typed', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('4242 4242 4242 4242'), '4242424242424242');
    expect(await screen.findByRole('img', { name: 'Visa' })).toBeInTheDocument();
  });

  it('creates the customer, tokenizes the card and navigates to the summary on success', async () => {
    mockedPost.mockResolvedValueOnce({ id: 'cust_1', fullName: 'Jane Doe', email: 'jane@example.com', phone: '3001234567' });
    mockedTokenize.mockResolvedValueOnce({ id: 'tok_1', brand: 'VISA', lastFour: '4242' });

    const { store } = renderPage();
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/checkout/config'));
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Continue to summary' }));

    await waitFor(() => expect(screen.getByText('summary page')).toBeInTheDocument());

    expect(mockedPost).toHaveBeenCalledWith('/customers', {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '3001234567',
    });
    expect(mockedTokenize).toHaveBeenCalledWith('pub_stagtest_123', {
      number: '4242424242424242',
      cvc: '123',
      expMonth: '12',
      expYear: '30',
      cardHolder: 'Jane Doe',
    });
    expect(store.getState().customer.id).toBe('cust_1');
    expect(store.getState().checkout.cardBrand).toBe('VISA');
    expect(store.getState().checkout.cardLast4).toBe('4242');
    expect(store.getState().checkout.deliveryAddress).toEqual({
      addressLine: 'Calle 10 # 5-30',
      city: 'Bogotá',
      department: 'Cundinamarca',
    });
  });

  it('shows an inline error when the gateway rejects the card', async () => {
    mockedPost.mockResolvedValueOnce({ id: 'cust_1', fullName: 'Jane Doe', email: 'jane@example.com', phone: '3001234567' });
    mockedTokenize.mockRejectedValueOnce(new WompiError(422, 'The card was declined'));

    renderPage();
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/checkout/config'));
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Continue to summary' }));

    expect(await screen.findByText('The card was declined')).toBeInTheDocument();
  });

  it('shows a retry banner when the checkout config fails to load', async () => {
    mockedGet.mockReset();
    mockedGet.mockRejectedValueOnce(new ApiError(503, 'GATEWAY_DOWN', 'Checkout is unavailable'));
    mockedGet.mockResolvedValueOnce(checkoutConfig);

    renderPage();
    expect(await screen.findByText('Checkout is unavailable')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByText('Checkout is unavailable')).not.toBeInTheDocument());
  });
});
