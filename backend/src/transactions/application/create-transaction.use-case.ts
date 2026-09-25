import { hashRequest } from '../../shared/crypto/hash-request';
import {
  CustomerNotFoundError,
  ErrorDetail,
  IdempotencyKeyReusedError,
  OutOfStockError,
  ProductNotFoundError,
  TransactionNotFoundError,
  ValidationError,
} from '../../shared/errors/domain-error';
import { ClockPort } from '../../shared/ports/clock.port';
import { IdGeneratorPort } from '../../shared/ports/id-generator.port';
import { Flow } from '../../shared/rop/flow';
import { err, ok, Result } from '../../shared/rop/result';
import { CustomerRepositoryPort } from '../../customers/domain/ports/customer.repository.port';
import { ProductRepositoryPort } from '../../products/domain/ports/product.repository.port';
import { Product } from '../../products/domain/product.types';
import { StockRepositoryPort } from '../../stock/domain/ports/stock.repository.port';
import { calculateQuote } from '../domain/fee-calculator';
import { IdempotencyStorePort } from '../domain/ports/idempotency-store.port';
import { TransactionRepositoryPort } from '../domain/ports/transaction.repository.port';
import { DeliveryAddress, Transaction } from '../domain/transaction.entity';

export const MAX_QUANTITY_PER_ORDER = 5;
export const CREATE_TRANSACTION_SCOPE = 'create-transaction';

export interface FeesConfig {
  baseFeeInCents: number;
  deliveryFeeInCents: number;
}

export interface CreateTransactionInput {
  idempotencyKey: string;
  productId: string;
  customerId: string;
  quantity: number;
  deliveryAddress: DeliveryAddress;
}

export interface CreateTransactionOutput {
  transaction: Transaction;
  /** false when an earlier request with the same Idempotency-Key was replayed. */
  created: boolean;
}

export type CreateTransactionError =
  | ValidationError
  | ProductNotFoundError
  | CustomerNotFoundError
  | OutOfStockError
  | IdempotencyKeyReusedError
  | TransactionNotFoundError;

export interface CreateTransactionDeps {
  products: ProductRepositoryPort;
  stock: StockRepositoryPort;
  customers: CustomerRepositoryPort;
  transactions: TransactionRepositoryPort;
  idempotency: IdempotencyStorePort;
  clock: ClockPort;
  ids: IdGeneratorPort;
  fees: FeesConfig;
}

export class CreateTransactionUseCase {
  constructor(private readonly deps: CreateTransactionDeps) {}

  execute(
    input: CreateTransactionInput,
  ): Promise<Result<CreateTransactionOutput, CreateTransactionError>> {
    const requestHash = hashRequest({
      productId: input.productId,
      customerId: input.customerId,
      quantity: input.quantity,
      deliveryAddress: input.deliveryAddress,
    });

    return Flow.of(this.validate(input))
      .andThen(() => this.findReplay(input.idempotencyKey, requestHash))
      .andThen((replayed) => this.createUnlessReplayed(input, requestHash, replayed))
      .done();
  }

  private validate(
    input: CreateTransactionInput,
  ): Result<CreateTransactionInput, ValidationError> {
    const issues: ErrorDetail[] = [];

    if (!input.idempotencyKey.trim()) {
      issues.push({ field: 'Idempotency-Key', issue: 'required' });
    }
    if (
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > MAX_QUANTITY_PER_ORDER
    ) {
      issues.push({
        field: 'quantity',
        issue: `must be an integer between 1 and ${MAX_QUANTITY_PER_ORDER}`,
      });
    }

    const { addressLine, city, department } = input.deliveryAddress;
    for (const [field, value] of Object.entries({ addressLine, city, department })) {
      if (!value.trim()) issues.push({ field: `deliveryAddress.${field}`, issue: 'required' });
    }

    return issues.length > 0 ? err(new ValidationError(issues)) : ok(input);
  }

  private async findReplay(
    key: string,
    requestHash: string,
  ): Promise<Result<Transaction | null, IdempotencyKeyReusedError | TransactionNotFoundError>> {
    const record = await this.deps.idempotency.find(CREATE_TRANSACTION_SCOPE, key);
    if (!record) return ok(null);
    if (record.requestHash !== requestHash) return err(new IdempotencyKeyReusedError());

    const transaction = await this.deps.transactions.findById(record.transactionId);
    return transaction ? ok(transaction) : err(new TransactionNotFoundError(record.transactionId));
  }

  private async createUnlessReplayed(
    input: CreateTransactionInput,
    requestHash: string,
    replayed: Transaction | null,
  ): Promise<Result<CreateTransactionOutput, CreateTransactionError>> {
    if (replayed) return ok({ transaction: replayed, created: false });
    return this.createNew(input, requestHash);
  }

  private createNew(
    input: CreateTransactionInput,
    requestHash: string,
  ): Promise<Result<CreateTransactionOutput, CreateTransactionError>> {
    return Flow.of(this.loadProduct(input.productId))
      .andThen((product) => this.ensureCustomerExists(input.customerId, product))
      .andThen((product) => this.ensureStock(product, input.quantity))
      .map((product) => this.buildTransaction(input, product))
      .andThen((transaction) => this.persist(transaction, input.idempotencyKey, requestHash))
      .map((transaction) => ({ transaction, created: true }))
      .done();
  }

  private async loadProduct(id: string): Promise<Result<Product, ProductNotFoundError>> {
    const product = await this.deps.products.findById(id);
    return product ? ok(product) : err(new ProductNotFoundError(id));
  }

  /** Passes `carry` through so the next step in the chain still has it. */
  private async ensureCustomerExists<T>(
    customerId: string,
    carry: T,
  ): Promise<Result<T, CustomerNotFoundError>> {
    const exists = await this.deps.customers.exists(customerId);
    return exists ? ok(carry) : err(new CustomerNotFoundError(customerId));
  }

  private async ensureStock(
    product: Product,
    quantity: number,
  ): Promise<Result<Product, OutOfStockError>> {
    const available = await this.deps.stock.getAvailable(product.id);
    return available >= quantity ? ok(product) : err(new OutOfStockError(available));
  }

  private buildTransaction(input: CreateTransactionInput, product: Product): Transaction {
    const now = this.deps.clock.now();
    const { addressLine, city, department, postalCode } = input.deliveryAddress;

    return Transaction.create({
      id: this.deps.ids.newId(),
      reference: this.deps.ids.newReference(now),
      productId: product.id,
      customerId: input.customerId,
      quantity: input.quantity,
      // Amounts are always recomputed here, never taken from the client.
      quote: calculateQuote(
        product.priceInCents,
        input.quantity,
        this.deps.fees.baseFeeInCents,
        this.deps.fees.deliveryFeeInCents,
      ),
      deliveryAddress: {
        addressLine: addressLine.trim(),
        city: city.trim(),
        department: department.trim(),
        postalCode: postalCode?.trim() || undefined,
      },
      now,
    });
  }

  private async persist(
    transaction: Transaction,
    key: string,
    requestHash: string,
  ): Promise<Result<Transaction, never>> {
    await this.deps.transactions.save(transaction);
    await this.deps.idempotency.save(CREATE_TRANSACTION_SCOPE, key, {
      requestHash,
      transactionId: transaction.id,
    });
    return ok(transaction);
  }
}