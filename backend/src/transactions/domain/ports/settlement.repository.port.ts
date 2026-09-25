import { AsyncResult } from '../../../shared/rop/result';
import { OutOfStockError } from '../../../shared/errors/domain-error';
import { Transaction } from '../transaction.entity';

/**
 * Atomically persists a transaction's final outcome. When the outcome is
 * APPROVED, this also creates the delivery and decrements stock, all in
 * one DB transaction, so a crash can't leave a delivery with no stock
 * update or vice versa. OutOfStockError is the race where stock ran out
 * between the initial check in create-transaction and settlement here.
 */
export interface SettlementRepositoryPort {
  commitOutcome(transaction: Transaction): AsyncResult<void, OutOfStockError>;
}