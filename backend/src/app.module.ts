import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProductsModule } from './products/products.module.js';
import { StockModule } from './stock/stock.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

@Module({
  imports: [ProductsModule, StockModule, CustomersModule, DeliveriesModule, TransactionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
