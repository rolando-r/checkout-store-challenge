import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeliveryStatus } from '../../domain/delivery.types';

@Entity('deliveries')
export class DeliveryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_id', type: 'uuid', unique: true })
  transactionId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'address_line', length: 200 })
  addressLine!: string;

  @Column({ length: 80 })
  city!: string;

  @Column({ length: 80 })
  department!: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.Assigned })
  status!: DeliveryStatus;
}