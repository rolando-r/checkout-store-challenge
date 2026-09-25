import { StockRepositoryPort } from '../domain/ports/stock.repository.port';
import { GetStockLevelsUseCase } from './get-stock-levels.use-case';

describe('GetStockLevelsUseCase', () => {
  it('returns whatever the repository reports', async () => {
    const stock: jest.Mocked<StockRepositoryPort> = {
      listAll: jest.fn().mockResolvedValue([{ productId: 'p1', quantity: 5 }]),
      getAvailable: jest.fn(),
      decrementIfAvailable: jest.fn(),
    };
    const useCase = new GetStockLevelsUseCase(stock);
    expect(await useCase.execute()).toEqual([{ productId: 'p1', quantity: 5 }]);
  });
});