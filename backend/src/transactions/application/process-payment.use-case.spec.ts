import {
  GatewayUnavailableError,
  InvalidTransactionStateError,
  OutOfStockError,
  TransactionNotFoundError,
} from '../../shared/errors/domain-error';
import { ok, err } from '../../shared/rop/result';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { calculateQuote } from '../domain/fee-calculator';
import { SettlementRepositoryPort } from '../domain/ports/settlement.repository.port';
import { TransactionRepositoryPort } from '../domain/ports/transaction.repository.port';
import { Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status';
import { FakePaymentGateway } from './testing/fake-payment-gateway';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import { CustomerRepositoryPort } from '../../customers/domain/ports/customer.repository.port';

const NOW = new Date('2026-09-24T10:00:00Z');

const buildTransaction = () =>
  Transaction.create({
    id: 'txn-1',
    reference: 'TXN-REF',
    productId: 'prod-1',
    customerId: 'cust-1',
    quantity: 1,
    quote: calculateQuote(100_000_00, 1, 3_000_00, 5_000_00),
    deliveryAddress: { addressLine: 'Calle 10', city: 'Aguachica', department: 'Cesar' },
    now: NOW,
  });

const build = (initial: Transaction = buildTransaction()) => {
  const gateway = new FakePaymentGateway();
  const transactions: jest.Mocked<TransactionRepositoryPort> = {
    findById: jest.fn().mockResolvedValue(initial),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const customers: jest.Mocked<CustomerRepositoryPort> = {
    exists: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn().mockResolvedValue({
      id: 'cust-1',
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '3001234567',
    }),
    save: jest.fn(),
  };
  const settlement: jest.Mocked<SettlementRepositoryPort> = {
    commitOutcome: jest.fn().mockResolvedValue(ok(undefined)),
  };
  const sleeper = { sleep: jest.fn().mockResolvedValue(undefined) };
  const deps = {
    transactions,
    customers,
    gateway,
    settlement,
    clock: { now: () => NOW },
    sleeper,
    poll: { intervalMs: 10, maxAttempts: 3 },
  };
  return { deps, gateway, transactions, customers, settlement, sleeper, useCase: new ProcessPaymentUseCase(deps) };
};

const input = {
  transactionId: 'txn-1',
  cardToken: 'tok_test',
  acceptanceToken: 'acc_test',
  installments: 1,
};

describe('ProcessPaymentUseCase', () => {
  it('settles immediately when the gateway approves on the first response', async () => {
    const { gateway, transactions, settlement, useCase } = build();
    gateway.chargeQueue.push(FakePaymentGateway.approvedCharge('gw-1'));

    const output = unwrap(await useCase.execute(input));

    expect(output.awaitingGateway).toBe(false);
    expect(output.transaction.status).toBe(TransactionStatus.Approved);
    expect(output.transaction.gatewayTransactionId).toBe('gw-1');
    expect(transactions.save).toHaveBeenCalledTimes(1); // only the attach step; final state goes via settlement
    expect(settlement.commitOutcome).toHaveBeenCalledWith(output.transaction);
  });

  it('settles a decline the same way', async () => {
    const { gateway, useCase } = build();
    gateway.chargeQueue.push(
      ok({
        gatewayTransactionId: 'gw-2',
        status: TransactionStatus.Declined,
        statusMessage: 'Insufficient funds',
        card: { brand: 'MASTERCARD', last4: '4444' },
      }),
    );

    const output = unwrap(await useCase.execute(input));

    expect(output.transaction.status).toBe(TransactionStatus.Declined);
    expect(output.awaitingGateway).toBe(false);
  });

  it('polls while pending and settles once the gateway resolves', async () => {
    const { gateway, sleeper, useCase } = build();
    gateway.chargeQueue.push(FakePaymentGateway.pendingCharge('gw-3'));
    gateway.statusQueue.push(
      ok({ status: TransactionStatus.Pending, statusMessage: 'Still processing' }),
      ok({ status: TransactionStatus.Approved, statusMessage: 'Approved' }),
    );

    const output = unwrap(await useCase.execute(input));

    expect(sleeper.sleep).toHaveBeenCalledTimes(2);
    expect(gateway.statusCalls).toEqual(['gw-3', 'gw-3']);
    expect(output.transaction.status).toBe(TransactionStatus.Approved);
    expect(output.awaitingGateway).toBe(false);
  });

  it('returns awaitingGateway when max poll attempts are exhausted', async () => {
    const { gateway, settlement, useCase } = build();
    gateway.chargeQueue.push(FakePaymentGateway.pendingCharge('gw-4'));
    gateway.statusQueue.push(
      ok({ status: TransactionStatus.Pending, statusMessage: 'p' }),
      ok({ status: TransactionStatus.Pending, statusMessage: 'p' }),
      ok({ status: TransactionStatus.Pending, statusMessage: 'p' }),
    );

    const output = unwrap(await useCase.execute(input));

    expect(output.awaitingGateway).toBe(true);
    expect(output.transaction.status).toBe(TransactionStatus.Pending);
    expect(settlement.commitOutcome).not.toHaveBeenCalled();
  });

  it('resumes by polling instead of charging again when a gateway id already exists', async () => {
    const alreadyCharging = unwrap(
      buildTransaction().attachGatewayId('gw-5', NOW) as any,
    ) as Transaction;
    const { gateway, useCase } = build(alreadyCharging);
    gateway.statusQueue.push(ok({ status: TransactionStatus.Approved, statusMessage: 'Approved' }));

    const output = unwrap(await useCase.execute(input));

    expect(gateway.chargeCalls).toHaveLength(0);
    expect(gateway.statusCalls).toEqual(['gw-5']);
    expect(output.transaction.status).toBe(TransactionStatus.Approved);
  });

  it('propagates a gateway error from charge without attaching an id', async () => {
    const { gateway, transactions, useCase } = build();
    gateway.chargeQueue.push(err(new GatewayUnavailableError()));

    const error = unwrapErr(await useCase.execute(input));

    expect(error).toBeInstanceOf(GatewayUnavailableError);
    expect(transactions.save).not.toHaveBeenCalled();
  });

  it('propagates a gateway error raised while polling', async () => {
    const { gateway, useCase } = build();
    gateway.chargeQueue.push(FakePaymentGateway.pendingCharge('gw-6'));
    gateway.statusQueue.push(err(new GatewayUnavailableError()));

    expect(unwrapErr(await useCase.execute(input))).toBeInstanceOf(GatewayUnavailableError);
  });

  it('propagates a settlement failure, such as a stock race', async () => {
    const { gateway, settlement, useCase } = build();
    gateway.chargeQueue.push(FakePaymentGateway.approvedCharge());
    settlement.commitOutcome.mockResolvedValue(err(new OutOfStockError(0)));

    expect(unwrapErr(await useCase.execute(input))).toBeInstanceOf(OutOfStockError);
  });

  it('fails when the transaction does not exist', async () => {
    const { transactions, useCase } = build();
    transactions.findById.mockResolvedValue(null);

    expect(unwrapErr(await useCase.execute(input))).toBeInstanceOf(TransactionNotFoundError);
  });

  it('fails when the transaction is already final', async () => {
    const voided = unwrap(buildTransaction().void(NOW) as any) as Transaction;
    const { useCase } = build(voided);

    const error = unwrapErr(await useCase.execute(input));

    expect(error).toBeInstanceOf(InvalidTransactionStateError);
  });

  it('includes the customer email when charging', async () => {
    const { gateway, useCase } = build();
    gateway.chargeQueue.push(FakePaymentGateway.approvedCharge());

    await useCase.execute(input);

    expect(gateway.chargeCalls[0].customerEmail).toBe('ana@example.com');
  });

  it('sends an empty email when the customer cannot be found', async () => {
    const { gateway, customers, useCase } = build();
    customers.findById.mockResolvedValue(null);
    gateway.chargeQueue.push(FakePaymentGateway.approvedCharge());

    await useCase.execute(input);

    expect(gateway.chargeCalls[0].customerEmail).toBe('');
  });
});