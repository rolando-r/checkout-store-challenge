import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PRODUCT_REPOSITORY, STOCK_REPOSITORY } from '../shared/tokens';
import { ProductsModule } from '../products/products.module';
import { GetStockForProductUseCase } from './application/get-stock-for-product.use-case';
import { GetStockLevelsUseCase } from './application/get-stock-levels.use-case';
import { StockOrmEntity } from './infrastructure/persistence/stock.orm-entity';
import { TypeOrmStockRepository } from './infrastructure/persistence/typeorm-stock.repository';
import { StockController } from './infrastructure/http/stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockOrmEntity]), forwardRef(() => ProductsModule)],
  controllers: [StockController],
  providers: [
    {
      provide: STOCK_REPOSITORY,
      useFactory: (repo: Repository<StockOrmEntity>) => new TypeOrmStockRepository(repo),
      inject: [getRepositoryToken(StockOrmEntity)],
    },
    {
      provide: GetStockLevelsUseCase,
      useFactory: (stock: TypeOrmStockRepository) => new GetStockLevelsUseCase(stock),
      inject: [STOCK_REPOSITORY],
    },
    {
      provide: GetStockForProductUseCase,
      useFactory: (products: unknown, stock: TypeOrmStockRepository) =>
        new GetStockForProductUseCase({ products: products as never, stock }),
      inject: [PRODUCT_REPOSITORY, STOCK_REPOSITORY],
    },
  ],
  exports: [STOCK_REPOSITORY],
})
export class StockModule {}