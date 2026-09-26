import {
  GatewayRejectedError,
  GatewayUnavailableError,
  InvalidTransactionStateError,
  OutOfStockError,
  TransactionNotFoundError,
} from '../../shared/errors/domain-error';
import { ClockPort } from '../../shared/ports/clock.port';
import { SleeperPort } from '../../shared/ports/sleeper.port';
import { Flow } from '../../shared/rop/flow';
import { AsyncResult, err, map, ok } from '../../shared/rop/result';
import {
  ChargeResult,
  PaymentGatewayPort,
} from '../domain/ports/payment-gateway.port';
import { SettlementRepositoryPort } from '../domain/ports/settlement.repository.port';
import { TransactionRepositoryPort } from '../domain/ports/transaction.repository.port';
import { CardSummary, Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status';
import { CustomerRepositoryPort } from '../../customers/domain/ports/customer.repository.port';

export interface ProcessPaymentInput {
  transactionId: string;
  cardToken: string;
  acceptanceToken: string;
  installments: number;
}

export interface ProcessPaymentOutput {
  transaction: Transaction;
  /** True when the gateway hasn't decided yet; the client should poll GET /transactions/:id. */
  awaitingGateway: boolean;
}

export type ProcessPaymentError =
  | TransactionNotFoundError
  | InvalidTransactionStateError
  | GatewayRejectedError
  | GatewayUnavailableError
  | OutOfStockError;

export interface PollConfig {
  intervalMs: number;
  maxAttempts: number;
}

export interface ProcessPaymentDeps {
  transactions: TransactionRepositoryPort;
  customers: CustomerRepositoryPort;
  gateway: PaymentGatewayPort;
  settlement: SettlementRepositoryPort;
  clock: ClockPort;
  sleeper: SleeperPort;
  poll: PollConfig;
}

type GatewayStatus =
  | typeof TransactionStatus.Pending
  | typeof TransactionStatus.Approved
  | typeof TransactionStatus.Declined;

interface ChargeState {
  transaction: Transaction;
  status: GatewayStatus;
  message: string;
  card: CardSummary | null;
}

export class ProcessPaymentUseCase {
  constructor(private readonly deps: ProcessPaymentDeps) {}

  execute(
    input: ProcessPaymentInput,
  ): Promise<import('../../shared/rop/result').Result<ProcessPaymentOutput, ProcessPaymentError>> {
    return Flow.of(this.loadPendingTransaction(input.transactionId))
      .andThen((transaction) => this.chargeOrResume(transaction, input))
      .andThen((state) => this.pollUntilFinal(state))
      .andThen((state) => this.settle(state))
      .done();
  }

  private async loadPendingTransaction(
    id: string,
  ): AsyncResult<Transaction, TransactionNotFoundError | InvalidTransactionStateError> {
    const transaction = await this.deps.transactions.findById(id);
    if (!transaction) return err(new TransactionNotFoundError(id));
    if (transaction.isFinal()) {
      return err(
        new InvalidTransactionStateError(transaction.status, TransactionStatus.Pending),
      );
    }
    return ok(transaction);
  }

  /** Resumes by polling if a charge was already started; otherwise charges now. */
  private async chargeOrResume(
    transaction: Transaction,
    input: ProcessPaymentInput,
  ): AsyncResult<ChargeState, GatewayRejectedError | GatewayUnavailableError | InvalidTransactionStateError> {
    if (transaction.gatewayTransactionId) {
      const statusResult = await this.deps.gateway.getStatus(transaction.gatewayTransactionId);
      return map(statusResult, (status) => ({
        transaction,
        status: status.status,
        message: status.statusMessage,
        card: transaction.card,
      }));
    }

    const customer = await this.deps.customers.findById(transaction.customerId);
    const chargeResult = await this.deps.gateway.charge({
      reference: transaction.reference,
      amountInCents: transaction.quote.totalAmountInCents,
      currency: 'COP',
      customerEmail: customer?.email ?? '',
      cardToken: input.cardToken,
      acceptanceToken: input.acceptanceToken,
      installments: input.installments,
    });
    if (!chargeResult.ok) return chargeResult;

    return this.attachAndSave(transaction, chargeResult.value);
  }

  private async attachAndSave(
    transaction: Transaction,
    charge: ChargeResult,
  ): AsyncResult<ChargeState, InvalidTransactionStateError> {
    const attachedResult = transaction.attachGatewayId(
      charge.gatewayTransactionId,
      this.deps.clock.now(),
    );
    if (!attachedResult.ok) return attachedResult;

    await this.deps.transactions.save(attachedResult.value);
    return ok({
      transaction: attachedResult.value,
      status: charge.status,
      message: charge.statusMessage,
      card: charge.card,
    });
  }

  private async pollUntilFinal(
    state: ChargeState,
  ): AsyncResult<ChargeState, GatewayRejectedError | GatewayUnavailableError> {
    let current = state;
    let attempts = 0;

    while (
      current.status === TransactionStatus.Pending &&
      attempts < this.deps.poll.maxAttempts
    ) {
      await this.deps.sleeper.sleep(this.deps.poll.intervalMs);
      // gatewayTransactionId is guaranteed set here: either chargeOrResume
      // resumed an existing one, or attachAndSave just persisted it.
      const statusResult = await this.deps.gateway.getStatus(
        current.transaction.gatewayTransactionId as string,
      );
      if (!statusResult.ok) return statusResult;

      current = {
        ...current,
        status: statusResult.value.status,
        message: statusResult.value.statusMessage,
      };
      attempts++;
    }

    return ok(current);
  }

  private async settle(
    state: ChargeState,
  ): AsyncResult<ProcessPaymentOutput, OutOfStockError | InvalidTransactionStateError> {
    if (state.status === TransactionStatus.Pending) {
      return ok({ transaction: state.transaction, awaitingGateway: true });
    }

    const outcomeResult = state.transaction.applyGatewayOutcome(
      {
        gatewayTransactionId: state.transaction.gatewayTransactionId as string,
        status: state.status,
        statusMessage: state.message,
        card: state.card as CardSummary,
      },
      this.deps.clock.now(),
    );
    if (!outcomeResult.ok) return outcomeResult;

    const finalTransaction = outcomeResult.value;
    const commitResult = await this.deps.settlement.commitOutcome(finalTransaction);
    return map(commitResult, () => ({ transaction: finalTransaction, awaitingGateway: false }));
  }
}