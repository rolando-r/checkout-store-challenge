import { ProductRepositoryPort } from '../domain/ports/product.repository.port';
import { StockRepositoryPort } from '../../stock/domain/ports/stock.repository.port';
import { ProductWithStock } from '../domain/product.types';

export interface ListProductsDeps {
  products: ProductRepositoryPort;
  stock: StockRepositoryPort;
}

/** No Result wrapper: listing the catalog has no domain-level failure mode.
 * A repository throwing is an infrastructure fault, handled by the global filter. */
export class ListProductsUseCase {
  constructor(private readonly deps: ListProductsDeps) {}

  async execute(): Promise<ProductWithStock[]> {
    const products = await this.deps.products.findAll();
    return Promise.all(
      products.map(async (product) => ({
        ...product,
        availableUnits: await this.deps.stock.getAvailable(product.id),
      })),
    );
  }
}