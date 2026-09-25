import { DeliveryNotFoundError } from '../../shared/errors/domain-error';
import { err, ok, Result } from '../../shared/rop/result';
import { DeliveryRepositoryPort } from '../domain/ports/delivery.repository.port';
import { Delivery } from '../domain/delivery.types';

export class GetDeliveryByTransactionUseCase {
  constructor(private readonly deliveries: DeliveryRepositoryPort) {}

  async execute(
    transactionId: string,
  ): Promise<Result<Delivery, DeliveryNotFoundError>> {
    const delivery = await this.deliveries.findByTransactionId(transactionId);
    return delivery ? ok(delivery) : err(new DeliveryNotFoundError(transactionId));
  }
}