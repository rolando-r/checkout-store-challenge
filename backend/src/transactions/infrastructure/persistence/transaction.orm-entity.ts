import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { DeliveryAddress, CardSummary } from '../../domain/transaction.entity';
import { TransactionStatus } from '../../domain/transaction-status';

@Entity('transactions')
export class TransactionOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 40 })
  reference!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column('int')
  quantity!: number;

  @Column({ name: 'product_amount_in_cents', type: 'bigint' })
  productAmountInCents!: string;

  @Column({ name: 'base_fee_in_cents', type: 'bigint' })
  baseFeeInCents!: string;

  @Column({ name: 'delivery_fee_in_cents', type: 'bigint' })
  deliveryFeeInCents!: string;

  @Column({ name: 'total_amount_in_cents', type: 'bigint' })
  totalAmountInCents!: string;

  @Column({ length: 3, default: 'COP' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.Pending,
  })
  status!: TransactionStatus;

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 60, nullable: true })
  gatewayTransactionId!: string | null;

  @Column({ name: 'gateway_status_message', type: 'text', nullable: true })
  statusMessage!: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 20, nullable: true })
  cardBrand!: string | null;

  @Column({ name: 'card_last4', type: 'char', length: 4, nullable: true })
  cardLast4!: string | null;

  @Column({ name: 'delivery_address', type: 'jsonb' })
  deliveryAddress!: DeliveryAddress;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

/** Maps between the persistence row and the domain entity's plain props shape. */
export const toOrmRow = (props: {
  id: string; reference: string; productId: string; customerId: string; quantity: number;
  quote: { productAmountInCents: number; baseFeeInCents: number; deliveryFeeInCents: number; totalAmountInCents: number };
  deliveryAddress: DeliveryAddress; status: TransactionStatus;
  gatewayTransactionId: string | null; statusMessage: string | null; card: CardSummary | null;
  createdAt: Date; updatedAt: Date;
}): TransactionOrmEntity => {
  const row = new TransactionOrmEntity();
  row.id = props.id;
  row.reference = props.reference;
  row.productId = props.productId;
  row.customerId = props.customerId;
  row.quantity = props.quantity;
  row.productAmountInCents = String(props.quote.productAmountInCents);
  row.baseFeeInCents = String(props.quote.baseFeeInCents);
  row.deliveryFeeInCents = String(props.quote.deliveryFeeInCents);
  row.totalAmountInCents = String(props.quote.totalAmountInCents);
  row.currency = 'COP';
  row.status = props.status;
  row.gatewayTransactionId = props.gatewayTransactionId;
  row.statusMessage = props.statusMessage;
  row.cardBrand = props.card?.brand ?? null;
  row.cardLast4 = props.card?.last4 ?? null;
  row.deliveryAddress = props.deliveryAddress;
  row.createdAt = props.createdAt;
  row.updatedAt = props.updatedAt;
  return row;
};

export const fromOrmRow = (row: TransactionOrmEntity) => ({
  id: row.id,
  reference: row.reference,
  productId: row.productId,
  customerId: row.customerId,
  quantity: row.quantity,
  quote: {
    productAmountInCents: Number(row.productAmountInCents),
    baseFeeInCents: Number(row.baseFeeInCents),
    deliveryFeeInCents: Number(row.deliveryFeeInCents),
    totalAmountInCents: Number(row.totalAmountInCents),
  },
  deliveryAddress: row.deliveryAddress,
  status: row.status,
  gatewayTransactionId: row.gatewayTransactionId,
  statusMessage: row.statusMessage,
  card: row.cardBrand && row.cardLast4 ? { brand: row.cardBrand, last4: row.cardLast4 } : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});