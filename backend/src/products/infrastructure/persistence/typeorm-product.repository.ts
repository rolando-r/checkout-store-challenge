import { Repository } from 'typeorm';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';
import { Product } from '../../domain/product.types';
import { ProductOrmEntity } from './product.orm-entity';

export class TypeOrmProductRepository implements ProductRepositoryPort {
  constructor(private readonly repo: Repository<ProductOrmEntity>) {}

  async findAll(): Promise<Product[]> {
    const rows = await this.repo.find();
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDomain(row) : null;
  }
}

const toDomain = (row: ProductOrmEntity): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  priceInCents: Number(row.priceInCents),
  currency: row.currency,
  imageUrl: row.imageUrl,
});