import { api } from './support/api-client';
import {
  APPROVED_TEST_CARD, DECLINED_TEST_CARD, getAcceptanceToken, tokenizeCard,
} from './support/gateway-sandbox';

jest.setTimeout(60000); // gateway polling can take a while

describe('Checkout flow (e2e)', () => {
  let productId: string;

  beforeAll(async () => {
    const products = await api().get('/products');
    const withStock = products.body.find((p: any) => p.availableUnits > 0);
    if (!withStock) throw new Error('No seeded product has stock; run npm run seed');
    productId = withStock.id;
  });

  const currentStock = async () => (await api().get(`/products/${productId}`)).body.availableUnits;

  const createCustomer = async (suffix: string) =>
    (
      await api().post('/customers').send({
        fullName: 'E2E Test Customer',
        email: `e2e-checkout-${suffix}-${Date.now()}@example.com`,
        phone: '3001234567',
      })
    ).body.id as string;

  const createTransaction = async (customerId: string) => {
    const response = await api()
      .post('/transactions')
      .set('Idempotency-Key', `e2e-${Date.now()}-${Math.random()}`)
      .send({
        productId,
        customerId,
        quantity: 1,
        deliveryAddress: { addressLine: 'Calle 10 # 5-20', city: 'Aguachica', department: 'Cesar' },
      });
    expect(response.status).toBe(201);
    return response.body;
  };

  const payAndAwaitFinal = async (transactionId: string, card: typeof APPROVED_TEST_CARD) => {
    const acceptanceToken = await getAcceptanceToken();
    const cardToken = await tokenizeCard(card);

    const payResponse = await api()
      .post(`/transactions/${transactionId}/payment`)
      .send({ cardToken, acceptanceToken, installments: 1 });
    expect([200, 202]).toContain(payResponse.status);

    let final = payResponse.body;
    let attempts = 0;
    while (final.status === 'PENDING' && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      final = (await api().get(`/transactions/${transactionId}`)).body;
      attempts++;
    }
    return final;
  };

  it('approves a transaction with the approved test card and decrements stock', async () => {
    const stockBefore = await currentStock();
    const customerId = await createCustomer('approved');
    const transaction = await createTransaction(customerId);

    const final = await payAndAwaitFinal(transaction.id, APPROVED_TEST_CARD);
    expect(final.status).toBe('APPROVED');

    expect(await currentStock()).toBe(stockBefore - 1);

    const delivery = await api().get(`/transactions/${transaction.id}/delivery`);
    expect(delivery.status).toBe(200);
    expect(delivery.body.status).toBe('ASSIGNED');
  });

  it('declines a transaction with the declined test card without touching stock', async () => {
    const stockBefore = await currentStock();
    const customerId = await createCustomer('declined');
    const transaction = await createTransaction(customerId);

    const final = await payAndAwaitFinal(transaction.id, DECLINED_TEST_CARD);
    expect(final.status).toBe('DECLINED');

    expect(await currentStock()).toBe(stockBefore);

    const delivery = await api().get(`/transactions/${transaction.id}/delivery`);
    expect(delivery.status).toBe(404);
  });

  it('rejects a second payment attempt on an already-approved transaction', async () => {
    const customerId = await createCustomer('double-pay');
    const transaction = await createTransaction(customerId);
    await payAndAwaitFinal(transaction.id, APPROVED_TEST_CARD);

    const acceptanceToken = await getAcceptanceToken();
    const cardToken = await tokenizeCard(APPROVED_TEST_CARD);
    const secondAttempt = await api()
      .post(`/transactions/${transaction.id}/payment`)
      .send({ cardToken, acceptanceToken, installments: 1 });

    expect(secondAttempt.status).toBe(409);
    expect(secondAttempt.body.code).toBe('INVALID_TRANSACTION_STATE');
  });
});