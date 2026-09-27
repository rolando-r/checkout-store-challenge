import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { checkoutReset } from '../features/checkout/checkoutSlice';
import { paymentReset, transactionStatusUpdated, TransactionStatus } from '../features/payment/paymentSlice';
import { productReset } from '../features/product/productSlice';
import { apiClient } from '../shared/api/client';
import { formatMoney } from '../shared/lib/money';
import styles from './ResultPage.module.css';

const POLL_INTERVAL_MS = 3000;

interface TransactionStatusResponse {
  status: TransactionStatus;
  statusMessage?: string | null;
}

type Tone = 'success' | 'failure' | 'pending';

interface StatusContent {
  tone: Tone;
  title: string;
  subtitle: string;
}

const STATUS_CONTENT: Record<TransactionStatus, StatusContent> = {
  [TransactionStatus.Approved]: {
    tone: 'success',
    title: 'Payment approved',
    subtitle: 'Your order is confirmed and on its way to the address you provided.',
  },
  [TransactionStatus.Declined]: {
    tone: 'failure',
    title: 'Payment declined',
    subtitle: 'Your bank declined the charge, so nothing was reserved and you have not been charged.',
  },
  [TransactionStatus.Error]: {
    tone: 'failure',
    title: 'Something went wrong',
    subtitle: 'We could not confirm this payment with the gateway. If you were charged, it will be reversed.',
  },
  [TransactionStatus.Voided]: {
    tone: 'failure',
    title: 'Payment voided',
    subtitle: 'This transaction was voided and no funds were captured.',
  },
  [TransactionStatus.Pending]: {
    tone: 'pending',
    title: 'Confirming your payment',
    subtitle: 'We are still checking the result with your bank. Refresh in a moment to see the final status.',
  },
};

export function ResultPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const product = useAppSelector((state) => state.product.selected);
  const quantity = useAppSelector((state) => state.product.quantity);
  const deliveryAddress = useAppSelector((state) => state.checkout.deliveryAddress);
  const transactionId = useAppSelector((state) => state.payment.transactionId);
  const status = useAppSelector((state) => state.payment.status);
  const statusMessage = useAppSelector((state) => state.payment.statusMessage);
  const reference = useAppSelector((state) => state.payment.reference);
  const totalAmountInCents = useAppSelector((state) => state.payment.totalAmountInCents);

  // The client's PENDING status only means "we don't know yet" — it is not
  // authoritative. A refresh (or landing here right after the payment call)
  // must not trust the stale, persisted status forever: it has to reconcile
  // with the backend's GET /transactions/:id, which itself re-checks the
  // gateway while the transaction is still open. This is what actually makes
  // the result step resilient to a refresh, instead of getting stuck showing
  // "Confirming your payment" indefinitely.
  useEffect(() => {
    if (!transactionId || status !== TransactionStatus.Pending) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiClient.get<TransactionStatusResponse>(`/transactions/${transactionId}`);
        if (cancelled) return;
        dispatch(transactionStatusUpdated({ status: result.status, statusMessage: result.statusMessage ?? null }));
        if (result.status === TransactionStatus.Pending) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        // Network hiccup or gateway still thinking — keep trying rather than
        // leaving the customer stuck on a stale screen.
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [transactionId, status, dispatch]);

  // RequireTransaction already guards this route, but stay defensive: without
  // a status there is nothing sensible to render.
  if (!status) return null;

  const { tone, title, subtitle } = STATUS_CONTENT[status];
  const currency = product?.currency ?? 'COP';

  const handleContinue = () => {
    // Clears the whole checkout session (product, customer, delivery/card
    // choice, transaction) so the next visit to the store starts clean and
    // picks up the freshly-updated stock from the backend.
    dispatch(paymentReset());
    dispatch(checkoutReset());
    dispatch(productReset());
    navigate('/');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.badge}>Step 4 of 4</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={`${styles.statusCard} ${styles[tone]}`}>
          <StatusIcon tone={tone} />
          {statusMessage && <p className={styles.statusMessage}>{statusMessage}</p>}
        </div>

        {product && (
          <div className={styles.recap}>
            <img className={styles.recapImage} src={product.imageUrl} alt={product.name} />
            <div className={styles.recapInfo}>
              <span className={styles.recapName}>{product.name}</span>
              <span className={styles.recapMeta}>
                Qty {quantity}
                {deliveryAddress ? ` · ${deliveryAddress.city}, ${deliveryAddress.department}` : ''}
              </span>
            </div>
          </div>
        )}

        <section className={styles.detailsCard}>
          <h2 className={styles.sectionTitle}>Transaction details</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Reference</dt>
              <dd>{reference ?? '—'}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Amount</dt>
              <dd>{totalAmountInCents != null ? formatMoney(totalAmountInCents, currency) : '—'}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Status</dt>
              <dd>{status}</dd>
            </div>
          </dl>
        </section>

        <button type="button" className={styles.continueButton} onClick={handleContinue}>
          Back to store
        </button>
      </div>
    </div>
  );
}

function StatusIcon({ tone }: { tone: Tone }) {
  if (tone === 'success') {
    return (
      <svg className={styles.icon} viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Approved">
        <circle cx="32" cy="32" r="32" fill="var(--color-mint)" />
        <path
          d="M20 33.5 28 41.5 44 24.5"
          fill="none"
          stroke="var(--color-mint-ink)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (tone === 'pending') {
    return (
      <svg className={styles.icon} viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Pending">
        <circle cx="32" cy="32" r="32" fill="var(--color-stone)" />
        <path
          d="M32 18v14l10 6"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className={styles.icon} viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Failed">
      <circle cx="32" cy="32" r="32" fill="var(--color-error-tint)" />
      <path d="M23 23 41 41M41 23 23 41" stroke="var(--color-error)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
