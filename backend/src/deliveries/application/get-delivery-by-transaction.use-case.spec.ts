import { DeliveryNotFoundError } from '../../shared/errors/domain-error';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { DeliveryRepositoryPort } from '../domain/ports/delivery.repository.port';
import { DeliveryStatus } from '../domain/delivery.types';
import { GetDeliveryByTransactionUseCase } from './get-delivery-by-transaction.use-case';

const delivery = {
  id: 'del-1', transactionId: 'txn-1', customerId: 'cust-1', productId: 'p1',
  addressLine: 'Calle 10', city: 'Aguachica', department: 'Cesar', status: DeliveryStatus.Assigned,
};

describe('GetDeliveryByTransactionUseCase', () => {
  it('returns the delivery for a transaction that has one', async () => {
    const deliveries: jest.Mocked<DeliveryRepositoryPort> = {
      findByTransactionId: jest.fn().mockResolvedValue(delivery),
    };
    const useCase = new GetDeliveryByTransactionUseCase(deliveries);
    expect(unwrap(await useCase.execute('txn-1'))).toEqual(delivery);
  });

  it('fails when no delivery exists yet', async () => {
    const deliveries: jest.Mocked<DeliveryRepositoryPort> = {
      findByTransactionId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetDeliveryByTransactionUseCase(deliveries);
    expect(unwrapErr(await useCase.execute('txn-2'))).toBeInstanceOf(DeliveryNotFoundError);
  });
});