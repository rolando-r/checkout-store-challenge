import { DataSource, EntityManager } from 'typeorm';
import { OutOfStockError } from '../../../shared/errors/domain-error';
import { err, ok } from '../../../shared/rop/result';
import { AsyncResult } from '../../../shared/rop/result';
import { SettlementRepositoryPort } from '../../domain/ports/settlement.repository.port';
import { Transaction } from '../../domain/transaction.entity';
import { TransactionStatus } from '../../domain/transaction-status';
import { toOrmRow, TransactionOrmEntity } from './transaction.orm-entity';
import { DeliveryOrmEntity } from '../../../deliveries/infrastructure/persistence/delivery.orm-entity';
import { StockOrmEntity } from '../../../stock/infrastructure/persistence/stock.orm-entity';

export class TypeOrmSettlementRepository implements SettlementRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async commitOutcome(
    transaction: Transaction,
  ): AsyncResult<void, OutOfStockError> {
    try {
      await this.dataSource.transaction((manager) =>
        this.runInTransaction(manager, transaction),
      );
      return ok(undefined);
    } catch (error) {
      if (error instanceof StockRanOutDuringSettlement) {
        return err(new OutOfStockError(0));
      }
      throw error;
    }
  }

  private async runInTransaction(
    manager: EntityManager,
    transaction: Transaction,
  ): AsyncResult<void, OutOfStockError> {
    await manager
      .getRepository(TransactionOrmEntity)
      .save(toOrmRow(transaction.toProps()));

    if (transaction.status !== TransactionStatus.Approved) {
      return ok(undefined);
    }

    const decremented = await this.decrementStock(manager, transaction);
    if (!decremented) {
      // Roll back the whole unit of work: an approved payment must not be
      // recorded without an assigned delivery and matching stock decrement.
      throw new StockRanOutDuringSettlement(transaction.quantity);
    }

    await manager.getRepository(DeliveryOrmEntity).insert({
      transactionId: transaction.id,
      customerId: transaction.customerId,
      productId: transaction.productId,
      addressLine: transaction.deliveryAddress.addressLine,
      city: transaction.deliveryAddress.city,
      department: transaction.deliveryAddress.department,
      postalCode: transaction.deliveryAddress.postalCode ?? null,
    });

    return ok(undefined);
  }

  private async decrementStock(
    manager: EntityManager,
    transaction: Transaction,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(StockOrmEntity)
      .set({
        quantity: () => `quantity - ${Number(transaction.quantity)}`,
        updatedAt: () => 'now()',
      } as never)
      .where('product_id = :productId AND quantity >= :quantity', {
        productId: transaction.productId,
        quantity: transaction.quantity,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}

/** Internal signal only: thrown to trigger a transaction rollback,
 * then converted back to a Result by commitOutcome's caller. */
class StockRanOutDuringSettlement extends Error {
  constructor(public readonly quantity: number) {
    super('Stock ran out during settlement');
  }
}