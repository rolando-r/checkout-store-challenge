import { Transaction } from '../transaction.entity';

export interface TransactionRepositoryPort {
  /** Insert or update. */
  save(transaction: Transaction): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
}