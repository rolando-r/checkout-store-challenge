import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CLOCK, CUSTOMER_REPOSITORY, ID_GENERATOR } from '../shared/tokens';
import { SystemClock } from '../shared/infrastructure/system-clock';
import { UuidIdGenerator } from '../shared/infrastructure/uuid-id-generator';
import { UpsertCustomerUseCase } from './application/upsert-customer.use-case';
import { CustomerOrmEntity } from './infrastructure/persistence/customer.orm-entity';
import { TypeOrmCustomerRepository } from './infrastructure/persistence/typeorm-customer.repository';
import { CustomersController } from './infrastructure/http/customers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrmEntity])],
  controllers: [CustomersController],
  providers: [
    {
      provide: CUSTOMER_REPOSITORY,
      useFactory: (repo: Repository<CustomerOrmEntity>) => new TypeOrmCustomerRepository(repo),
      inject: [getRepositoryToken(CustomerOrmEntity)],
    },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    {
      provide: UpsertCustomerUseCase,
      useFactory: (customers: TypeOrmCustomerRepository, ids: UuidIdGenerator) =>
        new UpsertCustomerUseCase({ customers, ids }),
      inject: [CUSTOMER_REPOSITORY, ID_GENERATOR],
    },
  ],
  exports: [CUSTOMER_REPOSITORY],
})
export class CustomersModule {}