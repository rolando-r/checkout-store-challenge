import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { customerSaved } from '../features/customer/customerSlice';
import { deliveryDetailsSubmitted } from '../features/checkout/checkoutSlice';
import { apiClient, ApiError } from '../shared/api/client';
import { tokenizeCard, WompiError } from '../shared/api/wompi';
import { useCheckoutConfig } from '../shared/hooks/useCheckoutConfig';
import { formatMoney } from '../shared/lib/money';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  isValidCvc,
  isValidExpiry,
} from '../shared/lib/card';
import styles from './CheckoutPage.module.css';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  department: string;
  postalCode: string;
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  fullName: '',
  email: '',
  phone: '',
  addressLine: '',
  city: '',
  department: '',
  postalCode: '',
  cardHolder: '',
  cardNumber: '',
  expiry: '',
  cvc: '',
};

interface CustomerResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (form.fullName.trim().length < 3) errors.fullName = 'Enter the full name (at least 3 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!/^3\d{9}$/.test(form.phone)) errors.phone = 'Enter a 10-digit Colombian mobile number (e.g. 3001234567).';

  if (form.addressLine.trim().length < 5) errors.addressLine = 'Enter the delivery address.';
  if (!form.city.trim()) errors.city = 'Enter the city.';
  if (!form.department.trim()) errors.department = 'Enter the department.';

  if (!form.cardHolder.trim()) errors.cardHolder = 'Enter the name as it appears on the card.';
  if (!isValidCardNumber(form.cardNumber)) errors.cardNumber = 'Enter a valid card number.';

  const [month = '', year = ''] = form.expiry.split('/');
  if (!isValidExpiry(month, year)) errors.expiry = 'Enter a valid, non-expired MM/YY date.';

  if (!isValidCvc(form.cvc)) errors.cvc = 'Enter the 3 or 4 digit security code.';

  return errors;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const product = useAppSelector((state) => state.product.selected);
  const quantity = useAppSelector((state) => state.product.quantity);
  const { config, isLoading: isConfigLoading, isError: isConfigError, error: configError, refetch } =
    useCheckoutConfig();

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) return null;

  const cardBrand = detectCardBrand(form.cardNumber);

  const setField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phone: digits }));
    setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleCardNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, cardNumber: formatCardNumber(event.target.value) }));
    setErrors((prev) => ({ ...prev, cardNumber: undefined }));
  };

  const handleExpiryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, expiry: formatExpiry(event.target.value) }));
    setErrors((prev) => ({ ...prev, expiry: undefined }));
  };

  const handleCvcChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
    setForm((prev) => ({ ...prev, cvc: digits }));
    setErrors((prev) => ({ ...prev, cvc: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!config) {
      setSubmitError('Checkout is not ready yet. Please try again in a moment.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const customer = await apiClient.post<CustomerResponse>('/customers', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone,
      });

      const [expMonth, expYear] = form.expiry.split('/');
      const tokenized = await tokenizeCard(config.gateway.publicKey, {
        number: form.cardNumber.replace(/\s/g, ''),
        cvc: form.cvc,
        expMonth,
        expYear,
        cardHolder: form.cardHolder.trim(),
      });

      dispatch(customerSaved(customer));
      dispatch(
        deliveryDetailsSubmitted({
          address: {
            addressLine: form.addressLine.trim(),
            city: form.city.trim(),
            department: form.department.trim(),
            ...(form.postalCode.trim() ? { postalCode: form.postalCode.trim() } : {}),
          },
          cardBrand: tokenized.brand,
          cardLast4: tokenized.lastFour,
        }),
      );

      navigate('/summary', { state: { cardToken: tokenized.id, acceptanceToken: config.gateway.acceptanceToken } });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof WompiError
          ? error.message
          : 'Something went wrong. Please check your details and try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
            ← Store
          </button>
          <span className={styles.badge}>Step 2 of 4</span>
          <h1 className={styles.title}>Delivery &amp; payment</h1>
          <p className={styles.subtitle}>Tell us where to send your order and how you&apos;d like to pay.</p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.recap}>
          <img className={styles.recapImage} src={product.imageUrl} alt={product.name} />
          <div className={styles.recapInfo}>
            <span className={styles.recapName}>{product.name}</span>
            <span className={styles.recapMeta}>Qty {quantity}</span>
          </div>
          <span className={styles.recapPrice}>{formatMoney(product.priceInCents * quantity, product.currency)}</span>
        </div>

        {isConfigError && (
          <div className={styles.errorBanner}>
            <p className={styles.errorMessage}>{configError}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact information</h2>
            <div className={styles.grid}>
              <Field label="Full name" error={errors.fullName}>
                <input
                  className={styles.input}
                  value={form.fullName}
                  onChange={setField('fullName')}
                  autoComplete="name"
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  className={styles.input}
                  value={form.email}
                  onChange={setField('email')}
                  autoComplete="email"
                  placeholder="jane@example.com"
                />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input
                  className={styles.input}
                  value={form.phone}
                  onChange={handlePhoneChange}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="3001234567"
                />
              </Field>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Delivery address</h2>
            <div className={styles.grid}>
              <Field label="Address" error={errors.addressLine} fullWidth>
                <input
                  className={styles.input}
                  value={form.addressLine}
                  onChange={setField('addressLine')}
                  autoComplete="street-address"
                  placeholder="Calle 10 # 5-30, Apt 201"
                />
              </Field>
              <Field label="City" error={errors.city}>
                <input
                  className={styles.input}
                  value={form.city}
                  onChange={setField('city')}
                  autoComplete="address-level2"
                  placeholder="Bogotá"
                />
              </Field>
              <Field label="Department" error={errors.department}>
                <input
                  className={styles.input}
                  value={form.department}
                  onChange={setField('department')}
                  autoComplete="address-level1"
                  placeholder="Cundinamarca"
                />
              </Field>
              <Field label="Postal code (optional)">
                <input
                  className={styles.input}
                  value={form.postalCode}
                  onChange={setField('postalCode')}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="110111"
                />
              </Field>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Pay with credit card</h2>
            <div className={styles.grid}>
              <Field label="Cardholder name" error={errors.cardHolder} fullWidth>
                <input
                  className={styles.input}
                  value={form.cardHolder}
                  onChange={setField('cardHolder')}
                  autoComplete="cc-name"
                  placeholder="As it appears on the card"
                />
              </Field>
              <Field label="Card number" error={errors.cardNumber} fullWidth>
                <div className={styles.cardNumberWrap}>
                  <input
                    className={styles.input}
                    value={form.cardNumber}
                    onChange={handleCardNumberChange}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                  />
                  {cardBrand !== 'UNKNOWN' && <CardBrandIcon brand={cardBrand} />}
                </div>
              </Field>
              <Field label="Expiry (MM/YY)" error={errors.expiry}>
                <input
                  className={styles.input}
                  value={form.expiry}
                  onChange={handleExpiryChange}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="12/28"
                />
              </Field>
              <Field label="CVC" error={errors.cvc}>
                <input
                  className={styles.input}
                  value={form.cvc}
                  onChange={handleCvcChange}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                />
              </Field>
            </div>
            <p className={styles.secureNote}>
              Card details are sent directly to our payment provider and never touch our servers.
            </p>
          </section>

          {submitError && <p className={styles.submitError}>{submitError}</p>}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting || isConfigLoading}>
            {isSubmitting ? 'Processing…' : 'Continue to summary'}
          </button>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

function Field({ label, error, fullWidth, children }: FieldProps) {
  return (
    <label className={[styles.field, fullWidth ? styles.fieldFullWidth : ''].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}

function CardBrandIcon({ brand }: { brand: 'VISA' | 'MASTERCARD' }) {
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
