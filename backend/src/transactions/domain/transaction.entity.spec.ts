import { Transaction } from './transaction.entity';
import { TransactionStatus } from './transaction-status';
import { calculateQuote } from './fee-calculator';
import { InvalidTransactionStateError } from '../../shared/errors/domain-error';

const baseQuote = calculateQuote(100_000_00, 1, 3_000_00, 5_000_00);

const buildTransaction = (now = new Date('2026-09-24T10:00:00Z')) =>
  Transaction.create({
    id: 'txn-1',
    reference: 'TXN-1',
    productId: 'prod-1',
    customerId: 'cust-1',
    quantity: 1,
    quote: baseQuote,
    deliveryAddress: {
      addressLine: 'Calle 10 # 5-20',
      city: 'Aguachica',
      department: 'Cesar',
    },
    now,
  });

describe('Transaction', () => {
  it('exposes all its properties', () => {
    const txn = buildTransaction();
    expect(txn.id).toBe('txn-1');
    expect(txn.reference).toBe('TXN-1');
    expect(txn.productId).toBe('prod-1');
    expect(txn.customerId).toBe('cust-1');
    expect(txn.quantity).toBe(1);
    expect(txn.quote).toEqual(baseQuote);
    expect(txn.deliveryAddress.city).toBe('Aguachica');
    expect(txn.createdAt).toBeInstanceOf(Date);
    expect(txn.updatedAt).toBeInstanceOf(Date);
    expect(txn.statusMessage).toBeNull();
  });

  it('starts as PENDING with no gateway data', () => {
    const txn = buildTransaction();
    expect(txn.status).toBe(TransactionStatus.Pending);
    expect(txn.gatewayTransactionId).toBeNull();
    expect(txn.card).toBeNull();
    expect(txn.isPending()).toBe(true);
    expect(txn.isFinal()).toBe(false);
  });

  it('moves to APPROVED and records the gateway data', () => {
    const txn = buildTransaction();
    const later = new Date('2026-09-24T10:00:05Z');

    const result = txn.applyGatewayOutcome(
      {
        gatewayTransactionId: 'gw-123',
        status: TransactionStatus.Approved,
        statusMessage: 'Approved',
        card: { brand: 'VISA', last4: '4242' },
      },
      later,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe(TransactionStatus.Approved);
    expect(result.value.gatewayTransactionId).toBe('gw-123');
    expect(result.value.card).toEqual({ brand: 'VISA', last4: '4242' });
    expect(result.value.updatedAt).toBe(later);
    expect(result.value.isFinal()).toBe(true);
  });

  it('moves to DECLINED the same way', () => {
    const txn = buildTransaction();
    const result = txn.applyGatewayOutcome(
      {
        gatewayTransactionId: 'gw-456',
        status: TransactionStatus.Declined,
        statusMessage: 'Insufficient funds',
        card: { brand: 'MASTERCARD', last4: '4444' },
      },
      new Date(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe(TransactionStatus.Declined);
    expect(result.value.isApproved()).toBe(false);
  });

  it('rejects a second gateway outcome once already final', () => {
    const txn = buildTransaction();
    const approvedResult = txn.applyGatewayOutcome(
      {
        gatewayTransactionId: 'gw-1',
        status: TransactionStatus.Approved,
        statusMessage: 'Approved',
        card: { brand: 'VISA', last4: '1111' },
      },
      new Date(),
    );
    if (!approvedResult.ok) throw new Error('setup failed');
    const approved = approvedResult.value;

    const second = approved.applyGatewayOutcome(
      {
        gatewayTransactionId: 'gw-2',
        status: TransactionStatus.Declined,
        statusMessage: 'Retry',
        card: { brand: 'VISA', last4: '1111' },
      },
      new Date(),
    );

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(InvalidTransactionStateError);
  });

  it('can be voided while PENDING', () => {
    const txn = buildTransaction();
    const result = txn.void(new Date());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe(TransactionStatus.Voided);
    expect(result.value.isFinal()).toBe(true);
  });

  it('cannot be voided once already final', () => {
    const txn = buildTransaction();
    const voidedResult = txn.void(new Date());
    if (!voidedResult.ok) throw new Error('setup failed');

    const second = voidedResult.value.void(new Date());
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(InvalidTransactionStateError);
  });

  it('restore rehydrates props without re-checking creation invariants', () => {
    const original = buildTransaction();
    const restored = Transaction.restore(original.toProps());
    expect(restored.toProps()).toEqual(original.toProps());
  });
});
