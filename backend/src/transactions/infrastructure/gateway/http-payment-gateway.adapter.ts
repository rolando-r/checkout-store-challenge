import { createHash } from 'node:crypto';
import {
  GatewayRejectedError,
  GatewayUnavailableError,
} from '../../../shared/errors/domain-error';
import { AsyncResult, err, ok } from '../../../shared/rop/result';
import {
  ChargeRequest,
  ChargeResult,
  GatewayError,
  PaymentGatewayPort,
  StatusResult,
} from '../../domain/ports/payment-gateway.port';
import { TransactionStatus } from '../../domain/transaction-status';

export interface GatewayConfig {
  baseUrl: string;
  publicKey: string;
  privateKey: string;
  integritySecret?: string;
}

/** Adapter for the sandbox payment gateway's REST API. Named generically
 * per the challenge's instructions not to reference the provider by name. */
export class HttpPaymentGateway implements PaymentGatewayPort {
  constructor(private readonly config: GatewayConfig) {}

  async charge(request: ChargeRequest): AsyncResult<ChargeResult, GatewayError> {
    const signature = this.buildSignature(request.reference, request.amountInCents, request.currency);

    try {
      const response = await fetch(`${this.config.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.privateKey}`,
        },
        body: JSON.stringify({
          amount_in_cents: request.amountInCents,
          currency: request.currency,
          customer_email: undefined,
          reference: request.reference,
          payment_method: {
            type: 'CARD',
            token: request.cardToken,
            installments: request.installments,
          },
          acceptance_token: request.acceptanceToken,
          signature,
        }),
      });

      if (!response.ok) {
        return err(new GatewayRejectedError(`HTTP ${response.status}`));
      }

      const body = await response.json();
      const data = body.data;
      return ok({
        gatewayTransactionId: data.id,
        status: mapStatus(data.status),
        statusMessage: data.status_message ?? data.status,
        card: {
          brand: data.payment_method?.extra?.brand ?? 'UNKNOWN',
          last4: data.payment_method?.extra?.last_four ?? '0000',
        },
      });
    } catch {
      return err(new GatewayUnavailableError());
    }
  }

  async getStatus(gatewayTransactionId: string): AsyncResult<StatusResult, GatewayError> {
    try {
      const response = await fetch(`${this.config.baseUrl}/transactions/${gatewayTransactionId}`, {
        headers: { Authorization: `Bearer ${this.config.publicKey}` },
      });
      if (!response.ok) return err(new GatewayRejectedError(`HTTP ${response.status}`));

      const body = await response.json();
      const data = body.data;
      return ok({ status: mapStatus(data.status), statusMessage: data.status_message ?? data.status });
    } catch {
      return err(new GatewayUnavailableError());
    }
  }

  async getAcceptanceToken(): AsyncResult<string, GatewayError> {
    try {
      const response = await fetch(`${this.config.baseUrl}/merchants/${this.config.publicKey}`);
      if (!response.ok) return err(new GatewayRejectedError(`HTTP ${response.status}`));
      const body = await response.json();
      return ok(body.data.presigned_acceptance.acceptance_token);
    } catch {
      return err(new GatewayUnavailableError());
    }
  }

  private buildSignature(reference: string, amountInCents: number, currency: string): string {
    const secret = this.config.integritySecret ?? '';
    return createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${secret}`)
      .digest('hex');
  }
}

const mapStatus = (
  raw: string,
): typeof TransactionStatus.Approved | typeof TransactionStatus.Declined | typeof TransactionStatus.Pending => {
  if (raw === 'APPROVED') return TransactionStatus.Approved;
  if (raw === 'DECLINED' || raw === 'ERROR' || raw === 'VOIDED') return TransactionStatus.Declined;
  return TransactionStatus.Pending;
};