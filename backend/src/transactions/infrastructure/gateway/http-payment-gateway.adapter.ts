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

/**
 * Human-friendly labels for the field paths the gateway validates on this
 * gateway's requests. Falls back to a prettified version of the raw
 * field path for anything not explicitly listed here.
 */
const FIELD_LABELS: Record<string, string> = {
  amount_in_cents: 'Amount',
  currency: 'Currency',
  customer_email: 'Customer email',
  reference: 'Reference',
  acceptance_token: 'Acceptance token',
  signature: 'Signature',
  'payment_method.token': 'Card token',
  'payment_method.installments': 'Installments',
};

function humanizeField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const leaf = field.split('.').pop() ?? field;
  const spaced = leaf.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface GatewayErrorBody {
  error?: {
    type?: string;
    reason?: string;
    messages?: Record<string, string[]>;
  };
}

/**
 * The gateway's error envelope isn't uniform: a 404/401/etc. carries its
 * explanation in `error.reason`, but a 422 "INPUT_VALIDATION_ERROR"
 * carries it in `error.messages` instead (a map of field -> messages),
 * leaving `reason` empty. Reading only `reason` silently swallows the
 * one case (bad input) that's most useful to surface, and falls back to
 * an opaque "HTTP 422" with no explanation of what was wrong.
 */
function extractGatewayErrorMessage(body: GatewayErrorBody | null, status: number): string {
  const messages = body?.error?.messages;
  if (messages && typeof messages === 'object') {
    const [field, fieldMessages] = Object.entries(messages)[0] ?? [];
    const message = Array.isArray(fieldMessages) ? fieldMessages[0] : undefined;
    if (field && message) return `${humanizeField(field)} ${message}`;
  }
  return body?.error?.reason ?? `HTTP ${status}`;
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
        return err(new GatewayRejectedError(extractGatewayErrorMessage(body, response.status)));
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
        return err(new GatewayRejectedError(extractGatewayErrorMessage(body, response.status)));
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
        return err(new GatewayRejectedError(extractGatewayErrorMessage(body, response.status)));
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