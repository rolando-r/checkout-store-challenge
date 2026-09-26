import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StockOrmEntity } from '../../../stock/infrastructure/persistence/stock.orm-entity';

@Entity('products')
export class ProductOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column('text')
  description!: string;

  @Column({ name: 'price_in_cents', type: 'bigint' })
  priceInCents!: string; // pg returns bigint as string; convert at the repository boundary

  @Column({ length: 3, default: 'COP' })
  currency!: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl!: string;

  @OneToOne(() => StockOrmEntity, (stock) => stock.product)
  stock?: StockOrmEntity;
}