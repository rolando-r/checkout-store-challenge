import {
  CustomerNotFoundError,
  IdempotencyKeyReusedError,
  OutOfStockError,
  ProductNotFoundError,
  TransactionNotFoundError,
  ValidationError,
} from '../../shared/errors/domain-error';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { CustomerRepositoryPort } from '../../customers/domain/ports/customer.repository.port';
import { ProductRepositoryPort } from '../../products/domain/ports/product.repository.port';
import { Product } from '../../products/domain/product.types';
import { StockRepositoryPort } from '../../stock/domain/ports/stock.repository.port';
import { IdempotencyStorePort } from '../domain/ports/idempotency-store.port';
import { TransactionRepositoryPort } from '../domain/ports/transaction.repository.port';
import { TransactionStatus } from '../domain/transaction-status';
import {
  CreateTransactionInput,
  CreateTransactionUseCase,
} from './create-transaction.use-case';

const NOW = new Date('2026-09-24T10:00:00Z');

const product: Product = {
  id: 'prod-1',
  name: 'Headphones',
  description: 'Wireless headphones',
  priceInCents: 150_000_00,
  currency: 'COP',
  imageUrl: 'https://example.com/h.png',
};

const address = {
  addressLine: 'Calle 10 # 5-20',
  city: 'Aguachica',
  department: 'Cesar',
  postalCode: '205001',
};

const input: CreateTransactionInput = {
  idempotencyKey: 'key-1',
  productId: 'prod-1',
  customerId: 'cust-1',
  quantity: 2,
  deliveryAddress: address,
};

const build = () => {
  const deps = {
    products: { findById: jest.fn().mockResolvedValue(product) } as jest.Mocked<ProductRepositoryPort>,
    stock: {
      getAvailable: jest.fn().mockResolvedValue(10),
      decrementIfAvailable: jest.fn(),
    } as jest.Mocked<StockRepositoryPort>,
    customers: { exists: jest.fn().mockResolvedValue(true) } as jest.Mocked<CustomerRepositoryPort>,
    transactions: {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    } as jest.Mocked<TransactionRepositoryPort>,
    idempotency: {
      find: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IdempotencyStorePort>,
    clock: { now: () => NOW },
    ids: { newId: () => 'txn-1', newReference: () => 'TXN-REF' },
    fees: { baseFeeInCents: 3_000_00, deliveryFeeInCents: 5_000_00 },
  };
  return { deps, useCase: new CreateTransactionUseCase(deps) };
};

describe('CreateTransactionUseCase', () => {
  it('creates a PENDING transaction with a server-computed total', async () => {
    const { deps, useCase } = build();

    const output = unwrap(await useCase.execute(input));

    expect(output.created).toBe(true);
    expect(output.transaction.status).toBe(TransactionStatus.Pending);
    expect(output.transaction.reference).toBe('TXN-REF');
    expect(output.transaction.quote).toEqual({
      productAmountInCents: 300_000_00,
      baseFeeInCents: 3_000_00,
      deliveryFeeInCents: 5_000_00,
      totalAmountInCents: 308_000_00,
    });
    expect(deps.transactions.save).toHaveBeenCalledWith(output.transaction);
    expect(deps.idempotency.save).toHaveBeenCalledWith('create-transaction', 'key-1', {
      requestHash: expect.any(String),
      transactionId: 'txn-1',
    });
  });

  it('trims the address and drops a blank postal code', async () => {
    const { useCase } = build();

    const output = unwrap(
      await useCase.execute({
        ...input,
        deliveryAddress: {
          addressLine: '  Calle 10 # 5-20 ',
          city: ' Aguachica ',
          department: 'Cesar  ',
          postalCode: '   ',
        },
      }),
    );

    expect(output.transaction.deliveryAddress).toEqual({
      addressLine: 'Calle 10 # 5-20',
      city: 'Aguachica',
      department: 'Cesar',
      postalCode: undefined,
    });
  });

  it('replays the original transaction for the same key and payload', async () => {
    const { deps, useCase } = build();
    const first = unwrap(await useCase.execute(input));
    const storedRecord = deps.idempotency.save.mock.calls[0][2];
    deps.idempotency.find.mockResolvedValue(storedRecord);
    deps.transactions.findById.mockResolvedValue(first.transaction);
    deps.transactions.save.mockClear();

    const second = unwrap(await useCase.execute(input));

    expect(second).toEqual({ transaction: first.transaction, created: false });
    expect(deps.transactions.save).not.toHaveBeenCalled();
  });

  it('rejects the same key with a different payload', async () => {
    const { deps, useCase } = build();
    deps.idempotency.find.mockResolvedValue({ requestHash: 'other', transactionId: 'txn-9' });

    const error = unwrapErr(await useCase.execute(input));

    expect(error).toBeInstanceOf(IdempotencyKeyReusedError);
    expect(deps.transactions.save).not.toHaveBeenCalled();
  });

  it('fails when the stored transaction of a replayed key is missing', async () => {
    const { deps, useCase } = build();
    await useCase.execute(input);
    deps.idempotency.find.mockResolvedValue(deps.idempotency.save.mock.calls[0][2]);
    deps.transactions.findById.mockResolvedValue(null);

    const error = unwrapErr(await useCase.execute(input));

    expect(error).toBeInstanceOf(TransactionNotFoundError);
  });

  it('fails when the product does not exist', async () => {
    const { deps, useCase } = build();
    deps.products.findById.mockResolvedValue(null);

    expect(unwrapErr(await useCase.execute(input))).toBeInstanceOf(ProductNotFoundError);
    expect(deps.transactions.save).not.toHaveBeenCalled();
  });

  it('fails when the customer does not exist', async () => {
    const { deps, useCase } = build();
    deps.customers.exists.mockResolvedValue(false);

    expect(unwrapErr(await useCase.execute(input))).toBeInstanceOf(CustomerNotFoundError);
    expect(deps.transactions.save).not.toHaveBeenCalled();
  });

  it('fails when there is not enough stock', async () => {
    const { deps, useCase } = build();
    deps.stock.getAvailable.mockResolvedValue(1);

    const error = unwrapErr(await useCase.execute(input));

    expect(error).toBeInstanceOf(OutOfStockError);
    expect(error.details).toEqual([{ field: 'quantity', issue: 'max 1' }]);
    expect(deps.transactions.save).not.toHaveBeenCalled();
  });

  const invalidCases: Array<[string, Partial<CreateTransactionInput>, string]> = [
    ['a quantity below 1', { quantity: 0 }, 'quantity'],
    ['a quantity above the limit', { quantity: 6 }, 'quantity'],
    ['a fractional quantity', { quantity: 1.5 }, 'quantity'],
    ['a blank idempotency key', { idempotencyKey: '  ' }, 'Idempotency-Key'],
    ['a blank city', { deliveryAddress: { ...address, city: ' ' } }, 'deliveryAddress.city'],
  ];

  it.each(invalidCases)('rejects %s before touching any repository', async (_label, override, field) => {
    const { deps, useCase } = build();

    const error = unwrapErr(await useCase.execute({ ...input, ...override }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual([expect.objectContaining({ field })]);
    expect(deps.idempotency.find).not.toHaveBeenCalled();
    expect(deps.products.findById).not.toHaveBeenCalled();
  });
});