import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DELIVERY_REPOSITORY } from '../shared/tokens';
import { GetDeliveryByTransactionUseCase } from './application/get-delivery-by-transaction.use-case';
import { DeliveryOrmEntity } from './infrastructure/persistence/delivery.orm-entity';
import { TypeOrmDeliveryRepository } from './infrastructure/persistence/typeorm-delivery.repository';
import { DeliveriesController } from './infrastructure/http/deliveries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryOrmEntity])],
  controllers: [DeliveriesController],
  providers: [
    {
      provide: DELIVERY_REPOSITORY,
      useFactory: (repo: Repository<DeliveryOrmEntity>) => new TypeOrmDeliveryRepository(repo),
      inject: [getRepositoryToken(DeliveryOrmEntity)],
    },
    {
      provide: GetDeliveryByTransactionUseCase,
      useFactory: (deliveries: TypeOrmDeliveryRepository) => new GetDeliveryByTransactionUseCase(deliveries),
      inject: [DELIVERY_REPOSITORY],
    },
  ],
})
export class DeliveriesModule {}