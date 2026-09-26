import { GatewayUnavailableError } from '../../shared/errors/domain-error';
import { err, ok } from '../../shared/rop/result';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { PaymentGatewayPort } from '../domain/ports/payment-gateway.port';
import { GetCheckoutConfigUseCase } from './get-checkout-config.use-case';

describe('GetCheckoutConfigUseCase', () => {
  const build = () => {
    const gateway = { getAcceptanceToken: jest.fn().mockResolvedValue(ok('acc_token_123')) } as unknown as jest.Mocked<PaymentGatewayPort>;
    const useCase = new GetCheckoutConfigUseCase({
      gateway,
      fees: { baseFeeInCents: 300000, deliveryFeeInCents: 500000 },
      publicKey: 'pub_test_123',
      currency: 'COP',
    });
    return { gateway, useCase };
  };

  it('returns fees and gateway config with a fresh acceptance token', async () => {
    const { useCase } = build();
    expect(unwrap(await useCase.execute())).toEqual({
      currency: 'COP',
      baseFeeInCents: 300000,
      deliveryFeeInCents: 500000,
      gateway: { publicKey: 'pub_test_123', acceptanceToken: 'acc_token_123' },
    });
  });

  it('propagates a gateway error', async () => {
    const { gateway, useCase } = build();
    gateway.getAcceptanceToken.mockResolvedValue(err(new GatewayUnavailableError()));
    expect(unwrapErr(await useCase.execute())).toBeInstanceOf(GatewayUnavailableError);
  });
});