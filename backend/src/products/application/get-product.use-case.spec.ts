import { ProductNotFoundError } from '../../shared/errors/domain-error';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { ProductRepositoryPort } from '../domain/ports/product.repository.port';
import { StockRepositoryPort } from '../../stock/domain/ports/stock.repository.port';
import { GetProductUseCase } from './get-product.use-case';

const product = {
  id: 'p1', name: 'Headphones', description: 'd', priceInCents: 1000, currency: 'COP', imageUrl: 'h.png',
};

const build = () => {
  const products: jest.Mocked<ProductRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(product),
  };
  const stock: jest.Mocked<StockRepositoryPort> = {
    listAll: jest.fn(),
    getAvailable: jest.fn().mockResolvedValue(3),
    decrementIfAvailable: jest.fn(),
  };
  return { products, stock, useCase: new GetProductUseCase({ products, stock }) };
};

describe('GetProductUseCase', () => {
  it('returns the product with its available units', async () => {
    const { useCase } = build();
    expect(unwrap(await useCase.execute('p1'))).toEqual({ ...product, availableUnits: 3 });
  });

  it('fails when the product does not exist', async () => {
    const { products, useCase } = build();
    products.findById.mockResolvedValue(null);
    expect(unwrapErr(await useCase.execute('missing'))).toBeInstanceOf(ProductNotFoundError);
  });
});