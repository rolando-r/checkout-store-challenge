import { err, ok, Result } from '../../shared/rop/result';
import {
  InvalidTransactionStateError,
} from '../../shared/errors/domain-error';
import { TransactionStatus, isTerminalStatus } from './transaction-status';
import { Quote } from './fee-calculator';

export interface DeliveryAddress {
  addressLine: string;
  city: string;
  department: string;
  postalCode?: string;
}

export interface CardSummary {
  brand: string; // 'VISA' | 'MASTERCARD' | ...
  last4: string;
}

export interface GatewayOutcome {
  gatewayTransactionId: string;
  status: typeof TransactionStatus.Approved | typeof TransactionStatus.Declined | typeof TransactionStatus.Error;
  statusMessage: string;
  card: CardSummary;
}

export interface TransactionProps {
  id: string;
  reference: string;
  productId: string;
  customerId: string;
  quantity: number;
  quote: Quote;
  deliveryAddress: DeliveryAddress;
  status: TransactionStatus;
  gatewayTransactionId: string | null;
  statusMessage: string | null;
  card: CardSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Transaction {
  private constructor(private props: TransactionProps) {}

  static create(input: {
    id: string;
    reference: string;
    productId: string;
    customerId: string;
    quantity: number;
    quote: Quote;
    deliveryAddress: DeliveryAddress;
    now: Date;
  }): Transaction {
    return new Transaction({
      id: input.id,
      reference: input.reference,
      productId: input.productId,
      customerId: input.customerId,
      quantity: input.quantity,
      quote: input.quote,
      deliveryAddress: input.deliveryAddress,
      status: TransactionStatus.Pending,
      gatewayTransactionId: null,
      statusMessage: null,
      card: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Rehydrates a transaction already stored in the database. Skips invariants
   * that only make sense at creation time (e.g. starting status). */
  static restore(props: TransactionProps): Transaction {
    return new Transaction({ ...props });
  }

  get id(): string { return this.props.id; }
  get reference(): string { return this.props.reference; }
  get productId(): string { return this.props.productId; }
  get customerId(): string { return this.props.customerId; }
  get quantity(): number { return this.props.quantity; }
  get quote(): Quote { return this.props.quote; }
  get deliveryAddress(): DeliveryAddress { return this.props.deliveryAddress; }
  get status(): TransactionStatus { return this.props.status; }
  get gatewayTransactionId(): string | null { return this.props.gatewayTransactionId; }
  get statusMessage(): string | null { return this.props.statusMessage; }
  get card(): CardSummary | null { return this.props.card; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isPending(): boolean {
    return this.props.status === TransactionStatus.Pending;
  }

  isApproved(): boolean {
    return this.props.status === TransactionStatus.Approved;
  }

  /** Applies the gateway's final result. Only legal from PENDING. */
  applyGatewayOutcome(
    outcome: GatewayOutcome,
    now: Date,
  ): Result<Transaction, InvalidTransactionStateError> {
    if (!this.isPending()) {
      return err(
        new InvalidTransactionStateError(this.props.status, TransactionStatus.Pending),
      );
    }
    return ok(
      new Transaction({
        ...this.props,
        status: outcome.status,
        gatewayTransactionId: outcome.gatewayTransactionId,
        statusMessage: outcome.statusMessage,
        card: outcome.card,
        updatedAt: now,
      }),
    );
  }

  /** Cancels a transaction the customer abandoned before any gateway call. */
  void(now: Date): Result<Transaction, InvalidTransactionStateError> {
    if (!this.isPending()) {
      return err(
        new InvalidTransactionStateError(this.props.status, TransactionStatus.Pending),
      );
    }
    return ok(
      new Transaction({
        ...this.props,
        status: TransactionStatus.Voided,
        statusMessage: 'Cancelled by customer before payment',
        updatedAt: now,
      }),
    );
  }

  /** True once the transaction cannot change again, terminal or not. */
  isFinal(): boolean {
    return isTerminalStatus(this.props.status);
  }

  toProps(): Readonly<TransactionProps> {
    return { ...this.props };
  }
}