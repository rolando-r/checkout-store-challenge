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

export class WompiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface WompiTokenResponse {
  status?: string;
  data?: { id: string; brand: string; last_four: string };
  error?: { type?: string; reason?: string; messages?: Record<string, string[]> };
}

/**
 * Tokenizes raw card data directly against Wompi, authenticated with the
 * merchant's PUBLIC key. This card data never touches our own backend —
 * only the resulting single-use token does — so the card number and CVC
 * never enter our servers or our persisted app state.
 */
export async function tokenizeCard(publicKey: string, input: TokenizeCardInput): Promise<TokenizedCard> {
  const response = await fetch(`${config.wompiApiUrl}/tokens/cards`, {
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

  const body: WompiTokenResponse | null = await response.json().catch(() => null);

  if (!response.ok || body?.status !== 'CREATED' || !body.data) {
    const message = firstErrorMessage(body) ?? 'The card could not be verified. Check the details and try again.';
    throw new WompiError(response.status, message);
  }

  return { id: body.data.id, brand: body.data.brand, lastFour: body.data.last_four };
}

function firstErrorMessage(body: WompiTokenResponse | null): string | undefined {
  const firstField = body?.error?.messages ? Object.values(body.error.messages)[0] : undefined;
  return firstField?.[0] ?? body?.error?.reason;
}
