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
  integritySecret: string;
}

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
          customer_email: request.customerEmail,
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

      const body = await response.json();
      if (!response.ok) {
        return err(new GatewayRejectedError(body?.error?.reason ?? `HTTP ${response.status}`));
      }

      const data = body.data;
      return ok({
        gatewayTransactionId: data.id,
        status: mapStatus(data.status),
        statusMessage: data.status_message ?? data.status,
        card: {
          brand: data.payment_method?.brand ?? 'UNKNOWN',
          last4: data.payment_method?.last_four ?? '0000',
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
      const body = await response.json();
      if (!response.ok) {
        return err(new GatewayRejectedError(body?.error?.reason ?? `HTTP ${response.status}`));
      }

      const data = body.data;
      return ok({ status: mapStatus(data.status), statusMessage: data.status_message ?? data.status });
    } catch {
      return err(new GatewayUnavailableError());
    }
  }

  async getAcceptanceToken(): AsyncResult<string, GatewayError> {
    try {
      const response = await fetch(`${this.config.baseUrl}/merchants/${this.config.publicKey}`);
      const body = await response.json();
      if (!response.ok) {
        return err(new GatewayRejectedError(body?.error?.reason ?? `HTTP ${response.status}`));
      }
      return ok(body.data.presigned_acceptance.acceptance_token);
    } catch {
      return err(new GatewayUnavailableError());
    }
  }

  private buildSignature(reference: string, amountInCents: number, currency: string): string {
    return createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${this.config.integritySecret}`)
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