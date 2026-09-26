import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IdempotencyRecord,
  IdempotencyStorePort,
} from '../../domain/ports/idempotency-store.port';
import { IdempotencyKeyOrmEntity } from './idempotency-key.orm-entity';

@Injectable()
export class TypeOrmIdempotencyStore implements IdempotencyStorePort {
  constructor(
    @InjectRepository(IdempotencyKeyOrmEntity)
    private readonly repo: Repository<IdempotencyKeyOrmEntity>,
  ) {}

  async find(scope: string, key: string): Promise<IdempotencyRecord | null> {
    const row = await this.repo.findOneBy({ scope, key });
    return row ? { requestHash: row.requestHash, transactionId: row.transactionId } : null;
  }

  async save(scope: string, key: string, record: IdempotencyRecord): Promise<void> {
    // Two concurrent requests with the same fresh key can both pass `find`
    // and race here; the (scope, key) primary key makes the loser's insert
    // fail instead of silently overwriting, which the use case should treat
    // as "someone else just created it" and re-read.
    await this.repo.insert({ scope, key, requestHash: record.requestHash, transactionId: record.transactionId });
  }
}