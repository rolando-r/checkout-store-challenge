import { AsyncResult } from '../../../shared/rop/result';
import {
  GatewayRejectedError,
  GatewayUnavailableError,
} from '../../../shared/errors/domain-error';
import { CardSummary } from '../transaction.entity';
import { TransactionStatus } from '../transaction-status';

export interface ChargeRequest {
  reference: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  cardToken: string;
  acceptanceToken: string;
  installments: number;
}

export interface ChargeResult {
  gatewayTransactionId: string;
  status: typeof TransactionStatus.Approved
    | typeof TransactionStatus.Declined
    | typeof TransactionStatus.Pending;
  statusMessage: string;
  card: CardSummary;
}

export interface StatusResult {
  status: typeof TransactionStatus.Approved
    | typeof TransactionStatus.Declined
    | typeof TransactionStatus.Pending;
  statusMessage: string;
}

export type GatewayError = GatewayRejectedError | GatewayUnavailableError;

/**
 * Port for the external payment gateway. The application layer only knows
 * this interface, never the gateway's SDK or HTTP shape, so it can be
 * swapped or faked in tests.
 */
export interface PaymentGatewayPort {
  charge(request: ChargeRequest): AsyncResult<ChargeResult, GatewayError>;
  getStatus(gatewayTransactionId: string): AsyncResult<StatusResult, GatewayError>;
  getAcceptanceToken(): AsyncResult<string, GatewayError>;
}