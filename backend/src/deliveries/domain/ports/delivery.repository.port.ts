import { Delivery } from '../delivery.types';

export interface DeliveryRepositoryPort {
  findByTransactionId(transactionId: string): Promise<Delivery | null>;
}