import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [ProductsModule, StockModule, CustomersModule, DeliveriesModule, TransactionsModule],
})
export class AppModule {}
