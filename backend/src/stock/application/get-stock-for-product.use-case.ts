import { ProductNotFoundError } from '../../shared/errors/domain-error';
import { err, ok, Result } from '../../shared/rop/result';
import { ProductRepositoryPort } from '../../products/domain/ports/product.repository.port';
import { StockRepositoryPort } from '../domain/ports/stock.repository.port';

export interface GetStockForProductDeps {
  products: ProductRepositoryPort;
  stock: StockRepositoryPort;
}

export class GetStockForProductUseCase {
  constructor(private readonly deps: GetStockForProductDeps) {}

  async execute(productId: string): Promise<Result<number, ProductNotFoundError>> {
    const product = await this.deps.products.findById(productId);
    if (!product) return err(new ProductNotFoundError(productId));
    return ok(await this.deps.stock.getAvailable(productId));
  }
}