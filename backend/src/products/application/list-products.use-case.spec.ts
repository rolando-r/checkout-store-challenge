import { ProductRepositoryPort } from '../domain/ports/product.repository.port';
import { StockRepositoryPort } from '../../stock/domain/ports/stock.repository.port';
import { ListProductsUseCase } from './list-products.use-case';

const products = [
  { id: 'p1', name: 'Headphones', description: 'd', priceInCents: 1000, currency: 'COP', imageUrl: 'h.png' },
  { id: 'p2', name: 'Speaker', description: 'd', priceInCents: 2000, currency: 'COP', imageUrl: 's.png' },
];

describe('ListProductsUseCase', () => {
  it('attaches available stock to each product', async () => {
    const productsRepo: jest.Mocked<ProductRepositoryPort> = {
      findAll: jest.fn().mockResolvedValue(products),
      findById: jest.fn(),
    };
    const stockRepo: jest.Mocked<StockRepositoryPort> = {
      listAll: jest.fn(),
      getAvailable: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(0),
      decrementIfAvailable: jest.fn(),
    };
    const useCase = new ListProductsUseCase({ products: productsRepo, stock: stockRepo });

    const result = await useCase.execute();

    expect(result).toEqual([
      { ...products[0], availableUnits: 5 },
      { ...products[1], availableUnits: 0 },
    ]);
  });

  it('returns an empty list when there are no products', async () => {
    const productsRepo: jest.Mocked<ProductRepositoryPort> = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
    };
    const stockRepo: jest.Mocked<StockRepositoryPort> = {
      listAll: jest.fn(),
      getAvailable: jest.fn(),
      decrementIfAvailable: jest.fn(),
    };
    const useCase = new ListProductsUseCase({ products: productsRepo, stock: stockRepo });

    expect(await useCase.execute()).toEqual([]);
    expect(stockRepo.getAvailable).not.toHaveBeenCalled();
  });
});