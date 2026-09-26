import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CLOCK, CUSTOMER_REPOSITORY, FEES_CONFIG, ID_GENERATOR, IDEMPOTENCY_STORE,
  PAYMENT_GATEWAY, POLL_CONFIG, PRODUCT_REPOSITORY, SETTLEMENT_REPOSITORY,
  SLEEPER, STOCK_REPOSITORY, TRANSACTION_REPOSITORY,
} from '../shared/tokens';
import { SystemClock } from '../shared/infrastructure/system-clock';
import { TimerSleeper } from '../shared/infrastructure/timer-sleeper';
import { UuidIdGenerator } from '../shared/infrastructure/uuid-id-generator';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { StockModule } from '../stock/stock.module';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { ProcessPaymentUseCase } from './application/process-payment.use-case';
import { HttpPaymentGateway } from './infrastructure/gateway/http-payment-gateway.adapter';
import { IdempotencyKeyOrmEntity } from './infrastructure/persistence/idempotency-key.orm-entity';
import { TransactionOrmEntity } from './infrastructure/persistence/transaction.orm-entity';
import { TypeOrmIdempotencyStore } from './infrastructure/persistence/typeorm-idempotency-store';
import { TypeOrmSettlementRepository } from './infrastructure/persistence/typeorm-settlement.repository';
import { TypeOrmTransactionRepository } from './infrastructure/persistence/typeorm-transaction.repository';
import { TransactionsController } from './infrastructure/http/transactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOrmEntity, IdempotencyKeyOrmEntity]),
    ProductsModule,
    StockModule,
    CustomersModule,
  ],
  controllers: [TransactionsController],
  providers: [
    {
      provide: TRANSACTION_REPOSITORY,
      useFactory: (repo: Repository<TransactionOrmEntity>) =>
        new TypeOrmTransactionRepository(repo),
      inject: [getRepositoryToken(TransactionOrmEntity)],
    },
    {
      provide: IDEMPOTENCY_STORE,
      useFactory: (repo: Repository<IdempotencyKeyOrmEntity>) =>
        new TypeOrmIdempotencyStore(repo),
      inject: [getRepositoryToken(IdempotencyKeyOrmEntity)],
    },
    {
      provide: SETTLEMENT_REPOSITORY,
      useFactory: (dataSource: DataSource) =>
        new TypeOrmSettlementRepository(dataSource),
      inject: [DataSource],
    },
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService) =>
        new HttpPaymentGateway({
          baseUrl: config.getOrThrow('GATEWAY_BASE_URL'),
          publicKey: config.getOrThrow('GATEWAY_PUBLIC_KEY'),
          privateKey: config.getOrThrow('GATEWAY_PRIVATE_KEY'),
          integritySecret: config.getOrThrow('GATEWAY_INTEGRITY_SECRET'),
        }),
      inject: [ConfigService],
    },
    { provide: CLOCK, useClass: SystemClock },
    { provide: SLEEPER, useClass: TimerSleeper },
    {
      provide: ID_GENERATOR,
      useValue: new UuidIdGenerator(), // shared instance is fine; it's stateless
    },
    {
      provide: FEES_CONFIG,
      useFactory: (config: ConfigService) => ({
        baseFeeInCents: Number(config.getOrThrow('BASE_FEE_IN_CENTS')),
        deliveryFeeInCents: Number(config.getOrThrow('DELIVERY_FEE_IN_CENTS')),
      }),
      inject: [ConfigService],
    },
    {
      provide: POLL_CONFIG,
      useValue: { intervalMs: 3000, maxAttempts: 8 }, // ~24s, under API Gateway's 29s limit
    },
    {
      provide: CreateTransactionUseCase,
      useFactory: (
        products,
        stock,
        customers,
        transactions,
        idempotency,
        clock,
        ids,
        fees,
      ) =>
        new CreateTransactionUseCase({
          products,
          stock,
          customers,
          transactions,
          idempotency,
          clock,
          ids,
          fees,
        }),
      inject: [
        PRODUCT_REPOSITORY,
        STOCK_REPOSITORY,
        CUSTOMER_REPOSITORY,
        TRANSACTION_REPOSITORY,
        IDEMPOTENCY_STORE,
        CLOCK,
        ID_GENERATOR,
        FEES_CONFIG,
      ],
    },
    {
      provide: ProcessPaymentUseCase,
      useFactory: (
        transactions,
        customers,
        gateway,
        settlement,
        clock,
        sleeper,
        poll,
      ) =>
        new ProcessPaymentUseCase({
          transactions,
          customers,
          gateway,
          settlement,
          clock,
          sleeper,
          poll,
        }),
      inject: [
        TRANSACTION_REPOSITORY,
        CUSTOMER_REPOSITORY,
        PAYMENT_GATEWAY,
        SETTLEMENT_REPOSITORY,
        CLOCK,
        SLEEPER,
        POLL_CONFIG,
      ],
    },
  ],
})
export class TransactionsModule {}