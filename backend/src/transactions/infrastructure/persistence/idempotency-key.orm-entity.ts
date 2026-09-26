import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKeyOrmEntity {
  @PrimaryColumn({ length: 60 })
  scope!: string;

  @PrimaryColumn({ name: 'idempotency_key', length: 64 })
  key!: string;

  @Column({ name: 'request_hash', length: 64 })
  requestHash!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;
}