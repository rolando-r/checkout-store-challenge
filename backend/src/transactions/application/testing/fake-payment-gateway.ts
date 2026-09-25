import { ok, err, AsyncResult } from '../../../shared/rop/result';
import { GatewayUnavailableError } from '../../../shared/errors/domain-error';
import {
  ChargeRequest,
  ChargeResult,
  GatewayError,
  PaymentGatewayPort,
  StatusResult,
} from '../../domain/ports/payment-gateway.port';
import { TransactionStatus } from '../../domain/transaction-status';

/** Configurable fake for tests. Scripts a sequence of charge/status results. */
export class FakePaymentGateway implements PaymentGatewayPort {
  chargeQueue: Array<ReturnType<typeof ok<ChargeResult>> | ReturnType<typeof err<GatewayError>>> = [];
  statusQueue: Array<ReturnType<typeof ok<StatusResult>> | ReturnType<typeof err<GatewayError>>> = [];
  chargeCalls: ChargeRequest[] = [];
  statusCalls: string[] = [];

  async charge(request: ChargeRequest): AsyncResult<ChargeResult, GatewayError> {
    this.chargeCalls.push(request);
    return this.chargeQueue.shift() ?? err(new GatewayUnavailableError());
  }

  async getStatus(gatewayTransactionId: string): AsyncResult<StatusResult, GatewayError> {
    this.statusCalls.push(gatewayTransactionId);
    return this.statusQueue.shift() ?? err(new GatewayUnavailableError());
  }

  async getAcceptanceToken(): AsyncResult<string, GatewayError> {
    return ok('fake-acceptance-token');
  }

  static approvedCharge(gatewayTransactionId = 'gw-1'): ReturnType<typeof ok<ChargeResult>> {
    return ok({
      gatewayTransactionId,
      status: TransactionStatus.Approved,
      statusMessage: 'Approved',
      card: { brand: 'VISA', last4: '4242' },
    });
  }

  static pendingCharge(gatewayTransactionId = 'gw-1'): ReturnType<typeof ok<ChargeResult>> {
    return ok({
      gatewayTransactionId,
      status: TransactionStatus.Pending,
      statusMessage: 'Pending',
      card: { brand: 'VISA', last4: '4242' },
    });
  }
}