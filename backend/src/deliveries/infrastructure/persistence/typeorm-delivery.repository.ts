import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryRepositoryPort } from '../../domain/ports/delivery.repository.port';
import { Delivery } from '../../domain/delivery.types';
import { DeliveryOrmEntity } from './delivery.orm-entity';

@Injectable()
export class TypeOrmDeliveryRepository implements DeliveryRepositoryPort {
  constructor(
    @InjectRepository(DeliveryOrmEntity)
    private readonly repo: Repository<DeliveryOrmEntity>,
  ) {}

  async findByTransactionId(transactionId: string): Promise<Delivery | null> {
    const row = await this.repo.findOneBy({ transactionId });
    if (!row) return null;
    return { ...row, postalCode: row.postalCode ?? undefined };
  }
}