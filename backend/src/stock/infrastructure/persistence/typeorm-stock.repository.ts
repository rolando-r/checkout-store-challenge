import { Repository } from 'typeorm';
import { StockRepositoryPort } from '../../domain/ports/stock.repository.port';
import { StockLevel } from '../../domain/stock.types';
import { StockOrmEntity } from './stock.orm-entity';

export class TypeOrmStockRepository implements StockRepositoryPort {
  constructor(private readonly repo: Repository<StockOrmEntity>) {}

  async listAll(): Promise<StockLevel[]> {
    const rows = await this.repo.find();
    return rows.map((row) => ({ productId: row.productId, quantity: row.quantity }));
  }

  async getAvailable(productId: string): Promise<number> {
    const row = await this.repo.findOneBy({ productId });
    return row?.quantity ?? 0;
  }

  /** Atomic guarded update. Affects zero rows if stock ran out concurrently. */
  async decrementIfAvailable(productId: string, quantity: number): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(StockOrmEntity)
      .set({ quantity: () => `quantity - ${Number(quantity)}`, updatedAt: () => 'now()' } as never)
      .where('product_id = :productId AND quantity >= :quantity', { productId, quantity })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}