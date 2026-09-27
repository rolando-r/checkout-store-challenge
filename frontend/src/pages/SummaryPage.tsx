import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { CheckoutStep, stepChanged } from '../features/checkout/checkoutSlice';
import { transactionCreated, transactionStatusUpdated, type TransactionStatus } from '../features/payment/paymentSlice';
import { apiClient, ApiError } from '../shared/api/client';
import { useCheckoutConfig } from '../shared/hooks/useCheckoutConfig';
import { formatMoney } from '../shared/lib/money';
import styles from './SummaryPage.module.css';

interface PaymentHandoff {
  cardToken?: string;
  acceptanceToken?: string;
}

interface TransactionAmounts {
  productAmountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  currency: string;
}

interface TransactionResponse {
  id: string;
  reference: string;
  status: TransactionStatus;
  statusMessage: string | null;
  amounts: TransactionAmounts;
}

export function SummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const product = useAppSelector((state) => state.product.selected);
  const quantity = useAppSelector((state) => state.product.quantity);
  const customerId = useAppSelector((state) => state.customer.id);
  const deliveryAddress = useAppSelector((state) => state.checkout.deliveryAddress);
  const cardBrand = useAppSelector((state) => state.checkout.cardBrand);
  const cardLast4 = useAppSelector((state) => state.checkout.cardLast4);
  const idempotencyKey = useAppSelector((state) => state.checkout.idempotencyKey);

  const {
    config,
    isLoading: isConfigLoading,
    isError: isConfigError,
    error: configError,
    refetch,
  } = useCheckoutConfig();

  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  if (!product || !deliveryAddress) return null;

  // The card token is single-use and never written to persisted state (only
  // brand/last4 are), so it only survives while it rides along on this
  // in-memory router state. A refresh here loses it on purpose.
  const handoff = (location.state ?? {}) as PaymentHandoff;
  const canPay = Boolean(handoff.cardToken && handoff.acceptanceToken);

  const productAmountInCents = product.priceInCents * quantity;
  const baseFeeInCents = config?.baseFeeInCents ?? 0;
  const deliveryFeeInCents = config?.deliveryFeeInCents ?? 0;
  const totalInCents = productAmountInCents + baseFeeInCents + deliveryFeeInCents;
  const currency = config?.currency ?? product.currency;

  const handlePay = async () => {
    if (!customerId || !idempotencyKey || !handoff.cardToken || !handoff.acceptanceToken) {
      setPayError('Your session details are incomplete. Please go back and confirm your details again.');
      return;
    }

    setPayError(null);
    setIsProcessing(true);
    try {
      const transaction = await apiClient.post<TransactionResponse>(
        '/transactions',
        { productId: product.id, customerId, quantity, deliveryAddress },
        { 'Idempotency-Key': idempotencyKey },
      );

      dispatch(
        transactionCreated({
          id: transaction.id,
          reference: transaction.reference,
          totalAmountInCents: transaction.amounts.totalAmountInCents,
        }),
      );

      const paid = await apiClient.post<TransactionResponse>(`/transactions/${transaction.id}/payment`, {
        cardToken: handoff.cardToken,
        acceptanceToken: handoff.acceptanceToken,
        installments: 1,
      });

      dispatch(transactionStatusUpdated({ status: paid.status, statusMessage: paid.statusMessage ?? null }));
      dispatch(stepChanged(CheckoutStep.Result));
      navigate('/result');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'We could not process your payment. Please try again.';
      setPayError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/checkout')}>
            ← Delivery &amp; payment
          </button>
          <span className={styles.badge}>Step 3 of 4</span>
          <h1 className={styles.title}>Review &amp; pay</h1>
          <p className={styles.subtitle}>Check everything looks right before we charge your card.</p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.recap}>
          <img className={styles.recapImage} src={product.imageUrl} alt={product.name} />
          <div className={styles.recapInfo}>
            <span className={styles.recapName}>{product.name}</span>
            <span className={styles.recapMeta}>Qty {quantity}</span>
          </div>
          <span className={styles.recapPrice}>{formatMoney(productAmountInCents, product.currency)}</span>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Delivery to</h2>
          <p className={styles.detailLine}>{deliveryAddress.addressLine}</p>
          <p className={styles.detailLine}>
            {deliveryAddress.city}, {deliveryAddress.department}
            {deliveryAddress.postalCode ? ` · ${deliveryAddress.postalCode}` : ''}
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Paying with</h2>
          <div className={styles.cardRow}>
            {cardBrand && <CardBrandIcon brand={cardBrand} />}
            <span className={styles.detailLine}>
              {cardBrand ?? 'Card'} ending in {cardLast4 ?? '····'}
            </span>
          </div>
        </section>

        {isConfigError && (
          <div className={styles.errorBanner}>
            <p className={styles.errorMessage}>{configError}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}

        <section className={styles.summaryCard}>
          <h2 className={styles.sectionTitle}>Payment summary</h2>
          <dl className={styles.lineItems}>
            <div className={styles.lineItem}>
              <dt>Product ({quantity}×)</dt>
              <dd>{formatMoney(productAmountInCents, currency)}</dd>
            </div>
            <div className={styles.lineItem}>
              <dt>Base fee</dt>
              <dd>{formatMoney(baseFeeInCents, currency)}</dd>
            </div>
            <div className={styles.lineItem}>
              <dt>Delivery fee</dt>
              <dd>{formatMoney(deliveryFeeInCents, currency)}</dd>
            </div>
            <div className={`${styles.lineItem} ${styles.lineItemTotal}`}>
              <dt>Total</dt>
              <dd>{formatMoney(totalInCents, currency)}</dd>
            </div>
          </dl>
        </section>

        {!canPay && (
          <div className={styles.errorBanner}>
            <p className={styles.errorMessage}>
              We lost your card details after a refresh. Please go back and enter your payment info again.
            </p>
            <button type="button" className={styles.retryButton} onClick={() => navigate('/checkout')}>
              Back to payment details
            </button>
          </div>
        )}

        {payError && <p className={styles.submitError}>{payError}</p>}

        <button
          type="button"
          className={styles.payButton}
          disabled={!canPay || isProcessing || isConfigLoading}
          onClick={handlePay}
        >
          Pay {formatMoney(totalInCents, currency)}
        </button>
      </div>

      {isProcessing && (
        <div className={styles.backdrop} role="alert" aria-live="assertive">
          <div className={styles.backdropCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.backdropText}>Processing your payment…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CardBrandIcon({ brand }: { brand: string }) {
  if (brand === 'VISA') {
    return (
      <span className={styles.brandIcon} aria-label="Visa" role="img">
        <svg viewBox="0 0 36 24" width="36" height="24">
          <rect width="36" height="24" rx="4" fill="#1A1F71" />
          <text x="18" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fontStyle="italic" fill="#FFFFFF">
            VISA
          </text>
        </svg>
      </span>
    );
  }
  if (brand === 'MASTERCARD') {
    return (
      <span className={styles.brandIcon} aria-label="Mastercard" role="img">
        <svg viewBox="0 0 36 24" width="36" height="24">
          <rect width="36" height="24" rx="4" fill="#F5F6F3" />
          <circle cx="15" cy="12" r="7" fill="#EB001B" />
          <circle cx="21" cy="12" r="7" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </span>
    );
  }
  return null;
}