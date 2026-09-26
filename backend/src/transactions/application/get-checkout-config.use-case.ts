import { GatewayError, PaymentGatewayPort } from '../domain/ports/payment-gateway.port';
import { Result } from '../../shared/rop/result';
import { FeesConfig } from './create-transaction.use-case';

export interface CheckoutConfig {
  currency: string;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  gateway: { publicKey: string; acceptanceToken: string };
}

export interface GetCheckoutConfigDeps {
  gateway: PaymentGatewayPort;
  fees: FeesConfig;
  publicKey: string;
  currency: string;
}

export class GetCheckoutConfigUseCase {
  constructor(private readonly deps: GetCheckoutConfigDeps) {}

  async execute(): Promise<Result<CheckoutConfig, GatewayError>> {
    const tokenResult = await this.deps.gateway.getAcceptanceToken();
    if (!tokenResult.ok) return tokenResult;
    return {
      ok: true,
      value: {
        currency: this.deps.currency,
        baseFeeInCents: this.deps.fees.baseFeeInCents,
        deliveryFeeInCents: this.deps.fees.deliveryFeeInCents,
        gateway: { publicKey: this.deps.publicKey, acceptanceToken: tokenResult.value },
      },
    };
  }
}