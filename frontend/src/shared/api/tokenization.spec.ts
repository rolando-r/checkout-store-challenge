import { tokenizeCard, TokenizationError } from './tokenization';

describe('tokenizeCard', () => {
  const mockFetch = (status: number, body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the card data with a Bearer public-key header', async () => {
    mockFetch(200, { status: 'CREATED', data: { id: 'tok_1', brand: 'VISA', last_four: '4242' } });

    await tokenizeCard('pub_test_123', {
      number: '4242424242424242',
      cvc: '123',
      expMonth: '12',
      expYear: '26',
      cardHolder: 'Jane Doe',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tokens/cards'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer pub_test_123' }),
        body: JSON.stringify({
          number: '4242424242424242',
          cvc: '123',
          exp_month: '12',
          exp_year: '26',
          card_holder: 'Jane Doe',
        }),
      }),
    );
  });

  it('returns the token id, brand and last four digits on success', async () => {
    mockFetch(200, { status: 'CREATED', data: { id: 'tok_abc', brand: 'MASTERCARD', last_four: '4444' } });

    const result = await tokenizeCard('pub_test_123', {
      number: '5555555555554444',
      cvc: '123',
      expMonth: '01',
      expYear: '27',
      cardHolder: 'Jane Doe',
    });

    expect(result).toEqual({ id: 'tok_abc', brand: 'MASTERCARD', lastFour: '4444' });
  });

  it('throws a TokenizationError with the field message when the gateway rejects the card', async () => {
    mockFetch(422, { error: { type: 'INPUT_VALIDATION', messages: { number: ['is not a valid card number'] } } });

    await expect(
      tokenizeCard('pub_test_123', { number: '1', cvc: '1', expMonth: '1', expYear: '1', cardHolder: 'x' }),
    ).rejects.toMatchObject({ status: 422, message: 'Card number is not a valid card number' });
    await expect(
      tokenizeCard('pub_test_123', { number: '1', cvc: '1', expMonth: '1', expYear: '1', cardHolder: 'x' }),
    ).rejects.toBeInstanceOf(TokenizationError);
  });

  it('names the field even when it is not one of the known card fields', async () => {
    mockFetch(422, { error: { type: 'INPUT_VALIDATION', messages: { exp_year: ['no debe contener menos de 2 caracteres'] } } });

    await expect(
      tokenizeCard('pub_test_123', { number: '1', cvc: '1', expMonth: '1', expYear: '1', cardHolder: 'x' }),
    ).rejects.toMatchObject({ message: 'Expiration year no debe contener menos de 2 caracteres' });
  });

  it('falls back to a generic message when the gateway response has no details', async () => {
    mockFetch(500, {});

    await expect(
      tokenizeCard('pub_test_123', { number: '1', cvc: '1', expMonth: '1', expYear: '1', cardHolder: 'x' }),
    ).rejects.toMatchObject({ status: 500, message: 'The card could not be verified. Check the details and try again.' });
  });

  it('falls back to a generic message when the response body is not valid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    });

    await expect(
      tokenizeCard('pub_test_123', { number: '1', cvc: '1', expMonth: '1', expYear: '1', cardHolder: 'x' }),
    ).rejects.toMatchObject({ status: 500 });
  });
});