import { ProductNotFoundError } from '../../shared/errors/domain-error';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { ProductRepositoryPort } from '../../products/domain/ports/product.repository.port';
import { StockRepositoryPort } from '../domain/ports/stock.repository.port';
import { GetStockForProductUseCase } from './get-stock-for-product.use-case';

const build = (productExists = true) => {
  const products: jest.Mocked<ProductRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(productExists ? { id: 'p1' } : null),
  };
  const stock: jest.Mocked<StockRepositoryPort> = {
    listAll: jest.fn(),
    getAvailable: jest.fn().mockResolvedValue(7),
    decrementIfAvailable: jest.fn(),
  };
  return { products, stock, useCase: new GetStockForProductUseCase({ products, stock } as any) };
};

describe('GetStockForProductUseCase', () => {
  it('returns the available quantity for an existing product', async () => {
    const { useCase } = build();
    expect(unwrap(await useCase.execute('p1'))).toBe(7);
  });

  it('fails when the product does not exist', async () => {
    const { useCase } = build(false);
    expect(unwrapErr(await useCase.execute('missing'))).toBeInstanceOf(ProductNotFoundError);
  });
});