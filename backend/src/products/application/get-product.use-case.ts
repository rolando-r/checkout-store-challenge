import { ProductNotFoundError } from '../../shared/errors/domain-error';
import { err, ok, Result } from '../../shared/rop/result';
import { StockRepositoryPort } from '../../stock/domain/ports/stock.repository.port';
import { ProductRepositoryPort } from '../domain/ports/product.repository.port';
import { ProductWithStock } from '../domain/product.types';

export interface GetProductDeps {
  products: ProductRepositoryPort;
  stock: StockRepositoryPort;
}

export class GetProductUseCase {
  constructor(private readonly deps: GetProductDeps) {}

  async execute(id: string): Promise<Result<ProductWithStock, ProductNotFoundError>> {
    const product = await this.deps.products.findById(id);
    if (!product) return err(new ProductNotFoundError(id));

    const availableUnits = await this.deps.stock.getAvailable(id);
    return ok({ ...product, availableUnits });
  }
}