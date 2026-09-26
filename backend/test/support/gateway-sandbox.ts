export interface TestCard {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

/** Confirmed in Wompi's own sandbox docs: any other card number results in ERROR. */
export const APPROVED_TEST_CARD: TestCard = {
  number: '4242424242424242',
  cvc: '123',
  expMonth: '08',
  expYear: '29',
  cardHolder: 'Ana Perez',
};

export const DECLINED_TEST_CARD: TestCard = {
  number: '4111111111111111',
  cvc: '123',
  expMonth: '08',
  expYear: '29',
  cardHolder: 'Ana Perez',
};

const baseUrl = process.env.GATEWAY_BASE_URL as string;
const publicKey = process.env.GATEWAY_PUBLIC_KEY as string;

export async function tokenizeCard(card: TestCard): Promise<string> {
  const response = await fetch(`${baseUrl}/tokens/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicKey}` },
    body: JSON.stringify({
      number: card.number,
      cvc: card.cvc,
      exp_month: card.expMonth,
      exp_year: card.expYear,
      card_holder: card.cardHolder,
    }),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'CREATED') {
    throw new Error(`Card tokenization failed: ${JSON.stringify(body)}`);
  }
  return body.data.id;
}

export async function getAcceptanceToken(): Promise<string> {
  const response = await fetch(`${baseUrl}/merchants/${publicKey}`);
  const body = await response.json();
  if (!response.ok) throw new Error(`Failed to fetch acceptance token: ${JSON.stringify(body)}`);
  return body.data.presigned_acceptance.acceptance_token;
}