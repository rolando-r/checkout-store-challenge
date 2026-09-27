import { unwrapErr } from '../../../shared/testing/result-helpers';
import { GatewayRejectedError } from '../../../shared/errors/domain-error';
import { HttpPaymentGateway } from './http-payment-gateway.adapter';

const config = {
  baseUrl: 'https://api-sandbox.co.uat.wompi.dev/v1',
  publicKey: 'pub_stagtest_123',
  privateKey: 'prv_stagtest_123',
  integritySecret: 'integrity_123',
};

const mockFetchOnce = (status: number, body: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
};

const chargeRequest = {
  reference: 'REF-1',
  amountInCents: 100000,
  currency: 'COP',
  customerEmail: 'jane@example.com',
  cardToken: 'tok_1',
  acceptanceToken: 'accept_1',
  installments: 1,
};

describe('HttpPaymentGateway', () => {
  afterEach(() => jest.restoreAllMocks());

  it('surfaces the field-specific reason from a 422 INPUT_VALIDATION_ERROR instead of a bare HTTP code', async () => {
    mockFetchOnce(422, {
      error: {
        type: 'INPUT_VALIDATION_ERROR',
        messages: { customer_email: ['no debe contener menos de 5 caracteres'] },
      },
    });

    const gateway = new HttpPaymentGateway(config);
    const result = await gateway.charge(chargeRequest);

    const error = unwrapErr(result);
    expect(error).toBeInstanceOf(GatewayRejectedError);
    expect(error.message).toBe(
      'Payment gateway rejected the request: Customer email no debe contener menos de 5 caracteres',
    );
  });

  it('humanizes nested field paths using the known label when available', async () => {
    mockFetchOnce(422, {
      error: {
        type: 'INPUT_VALIDATION_ERROR',
        messages: { 'payment_method.token': ['is invalid or expired'] },
      },
    });

    const gateway = new HttpPaymentGateway(config);
    const error = unwrapErr(await gateway.charge(chargeRequest));

    expect(error.message).toBe('Payment gateway rejected the request: Card token is invalid or expired');
  });

  it('falls back to error.reason for non-validation error types', async () => {
    mockFetchOnce(404, { error: { type: 'NOT_FOUND_ERROR', reason: 'The requested entity does not exist.' } });

    const gateway = new HttpPaymentGateway(config);
    const error = unwrapErr(await gateway.getStatus('gw-1'));

    expect(error.message).toBe('Payment gateway rejected the request: The requested entity does not exist.');
  });

  it('falls back to a bare HTTP status only when the gateway gives no explanation at all', async () => {
    mockFetchOnce(422, {});

    const gateway = new HttpPaymentGateway(config);
    const error = unwrapErr(await gateway.charge(chargeRequest));

    expect(error.message).toBe('Payment gateway rejected the request: HTTP 422');
  });

  it('returns a gateway-unavailable error when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const gateway = new HttpPaymentGateway(config);
    const error = unwrapErr(await gateway.charge(chargeRequest));

    expect(error.message).toBe('Payment gateway is unavailable, try again shortly');
  });
});