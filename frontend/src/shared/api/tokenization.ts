import { config } from '../config';

export interface TokenizeCardInput {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export interface TokenizedCard {
  id: string;
  brand: string;
  lastFour: string;
}

export class TokenizationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface TokenizationResponse {
  status?: string;
  data?: { id: string; brand: string; last_four: string };
  error?: { type?: string; reason?: string; messages?: Record<string, string[]> };
}

/**
 * Tokenizes raw card data directly against the payment gateway, authenticated with the
 * merchant's PUBLIC key. This card data never touches our own backend —
 * only the resulting single-use token does — so the card number and CVC
 * never enter our servers or our persisted app state.
 */
export async function tokenizeCard(publicKey: string, input: TokenizeCardInput): Promise<TokenizedCard> {
  const response = await fetch(`${config.gatewayApiUrl}/tokens/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicKey}`,
    },
    body: JSON.stringify({
      number: input.number,
      cvc: input.cvc,
      exp_month: input.expMonth,
      exp_year: input.expYear,
      card_holder: input.cardHolder,
    }),
  });

  const body: TokenizationResponse | null = await response.json().catch(() => null);

  if (!response.ok || body?.status !== 'CREATED' || !body.data) {
    const message = firstErrorMessage(body) ?? 'The card could not be verified. Check the details and try again.';
    throw new TokenizationError(response.status, message);
  }

  return { id: body.data.id, brand: body.data.brand, lastFour: body.data.last_four };
}

/**
 * The gateway's field labels for the fields tokenization can reject. Its own
 * validation strings (e.g. "no debe contener menos de 16 caracteres") never
 * name the field themselves — that's only in the "messages" map's key — so
 * without this the person just sees a dangling sentence with no subject.
 */
const CARD_FIELD_LABELS: Record<string, string> = {
  number: 'Card number',
  cvc: 'Security code',
  exp_month: 'Expiration month',
  exp_year: 'Expiration year',
  card_holder: 'Cardholder name',
};

function firstErrorMessage(body: TokenizationResponse | null): string | undefined {
  const messages = body?.error?.messages;
  if (messages) {
    const [field, fieldMessages] = Object.entries(messages)[0] ?? [];
    const message = fieldMessages?.[0];
    if (field && message) {
      const label = CARD_FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
      return `${label} ${message}`;
    }
  }
  return body?.error?.reason;
}