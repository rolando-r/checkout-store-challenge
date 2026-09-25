import { StockRepositoryPort } from '../domain/ports/stock.repository.port';
import { StockLevel } from '../domain/stock.types';

export class GetStockLevelsUseCase {
  constructor(private readonly stock: StockRepositoryPort) {}

  execute(): Promise<StockLevel[]> {
    return this.stock.listAll();
  }
}