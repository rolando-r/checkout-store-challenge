import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ProductOrmEntity } from '../../../products/infrastructure/persistence/product.orm-entity';

@Entity('stock')
export class StockOrmEntity {
  @PrimaryColumn('uuid', { name: 'product_id' })
  productId!: string;

  @Column('int')
  quantity!: number;

  @OneToOne(() => ProductOrmEntity, (product) => product.stock)
  @JoinColumn({ name: 'product_id' })
  product?: ProductOrmEntity;
}