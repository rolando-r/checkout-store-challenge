import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PRODUCT_REPOSITORY, STOCK_REPOSITORY } from '../shared/tokens';
import { StockModule } from '../stock/stock.module';
import { GetProductUseCase } from './application/get-product.use-case';
import { ListProductsUseCase } from './application/list-products.use-case';
import { ProductOrmEntity } from './infrastructure/persistence/product.orm-entity';
import { TypeOrmProductRepository } from './infrastructure/persistence/typeorm-product.repository';
import { ProductsController } from './infrastructure/http/products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductOrmEntity]), forwardRef(() => StockModule)],
  controllers: [ProductsController],
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (repo: Repository<ProductOrmEntity>) => new TypeOrmProductRepository(repo),
      inject: [getRepositoryToken(ProductOrmEntity)],
    },
    {
      provide: ListProductsUseCase,
      useFactory: (products: TypeOrmProductRepository, stock: unknown) =>
        new ListProductsUseCase({ products, stock: stock as never }),
      inject: [PRODUCT_REPOSITORY, STOCK_REPOSITORY],
    },
    {
      provide: GetProductUseCase,
      useFactory: (products: TypeOrmProductRepository, stock: unknown) =>
        new GetProductUseCase({ products, stock: stock as never }),
      inject: [PRODUCT_REPOSITORY, STOCK_REPOSITORY],
    },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}