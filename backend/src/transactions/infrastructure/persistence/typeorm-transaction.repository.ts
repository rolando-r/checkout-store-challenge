import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionRepositoryPort } from '../../domain/ports/transaction.repository.port';
import { Transaction } from '../../domain/transaction.entity';
import { fromOrmRow, toOrmRow, TransactionOrmEntity } from './transaction.orm-entity';

@Injectable()
export class TypeOrmTransactionRepository implements TransactionRepositoryPort {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repo: Repository<TransactionOrmEntity>,
  ) {}

  async save(transaction: Transaction): Promise<void> {
    await this.repo.save(toOrmRow(transaction.toProps()));
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? Transaction.restore(fromOrmRow(row)) : null;
  }
}