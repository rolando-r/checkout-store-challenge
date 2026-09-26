import { OutOfStockError } from '../../../shared/errors/domain-error';
import { unwrap, unwrapErr } from '../../../shared/testing/result-helpers';
import { calculateQuote } from '../../domain/fee-calculator';
import { Transaction } from '../../domain/transaction.entity';
import { TypeOrmSettlementRepository } from './typeorm-settlement.repository';

const buildApprovedTransaction = () => {
  const created = Transaction.create({
    id: 'txn-1', reference: 'REF-1', productId: 'p1', customerId: 'c1', quantity: 2,
    quote: calculateQuote(1000, 2, 100, 200),
    deliveryAddress: { addressLine: 'A', city: 'B', department: 'C' },
    now: new Date(),
  });
  const outcome = created.applyGatewayOutcome(
    { gatewayTransactionId: 'gw-1', status: 'APPROVED' as never, statusMessage: 'ok', card: { brand: 'VISA', last4: '1111' } },
    new Date(),
  );
  if (!outcome.ok) throw new Error('setup failed');
  return outcome.value;
};

const buildManagerMock = (stockAffected: number) => {
  const saveTransaction = jest.fn().mockResolvedValue(undefined);
  const insertDelivery = jest.fn().mockResolvedValue(undefined);
  const execute = jest.fn().mockResolvedValue({ affected: stockAffected });

  const qb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute };

  return {
    manager: {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        if (entity.name === 'TransactionOrmEntity') return { save: saveTransaction };
        if (entity.name === 'DeliveryOrmEntity') return { insert: insertDelivery };
        return {};
      }),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    },
    saveTransaction,
    insertDelivery,
  };
};

describe('TypeOrmSettlementRepository', () => {
  it('saves the transaction, decrements stock and creates a delivery when APPROVED', async () => {
    const { manager, saveTransaction, insertDelivery } = buildManagerMock(1);
    const dataSource = { transaction: (cb: any) => cb(manager) } as any;
    const repo = new TypeOrmSettlementRepository(dataSource);

    unwrap(await repo.commitOutcome(buildApprovedTransaction()));

    expect(saveTransaction).toHaveBeenCalledTimes(1);
    expect(insertDelivery).toHaveBeenCalledTimes(1);
  });

  it('returns OutOfStockError and skips the delivery insert when stock ran out', async () => {
    const { manager, insertDelivery } = buildManagerMock(0);
    const dataSource = { transaction: (cb: any) => cb(manager) } as any;
    const repo = new TypeOrmSettlementRepository(dataSource);

    const error = unwrapErr(await repo.commitOutcome(buildApprovedTransaction()));

    expect(error).toBeInstanceOf(OutOfStockError);
    expect(insertDelivery).not.toHaveBeenCalled();
  });

  it('saves the transaction without touching stock or delivery when not APPROVED', async () => {
    const declined = Transaction.create({
      id: 'txn-2', reference: 'REF-2', productId: 'p1', customerId: 'c1', quantity: 1,
      quote: calculateQuote(1000, 1, 100, 200),
      deliveryAddress: { addressLine: 'A', city: 'B', department: 'C' },
      now: new Date(),
    }).applyGatewayOutcome(
      { gatewayTransactionId: 'gw-2', status: 'DECLINED' as never, statusMessage: 'insufficient funds', card: { brand: 'VISA', last4: '2222' } },
      new Date(),
    );
    if (!declined.ok) throw new Error('setup failed');

    const { manager, saveTransaction, insertDelivery } = buildManagerMock(1);
    const dataSource = { transaction: (cb: any) => cb(manager) } as any;
    const repo = new TypeOrmSettlementRepository(dataSource);

    unwrap(await repo.commitOutcome(declined.value));

    expect(saveTransaction).toHaveBeenCalledTimes(1);
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    expect(insertDelivery).not.toHaveBeenCalled();
  });

  it('re-throws an unexpected error instead of swallowing it as OutOfStockError', async () => {
    const manager = {
      getRepository: jest.fn().mockReturnValue({ save: jest.fn().mockRejectedValue(new Error('db down')) }),
      createQueryBuilder: jest.fn(),
    };
    const dataSource = { transaction: (cb: any) => cb(manager) } as any;
    const repo = new TypeOrmSettlementRepository(dataSource);

    await expect(repo.commitOutcome(buildApprovedTransaction())).rejects.toThrow('db down');
  });
});