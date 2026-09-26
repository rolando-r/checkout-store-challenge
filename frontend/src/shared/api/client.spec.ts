import { apiClient, ApiError } from './client';

describe('apiClient', () => {
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

  it('returns the parsed body on a successful GET', async () => {
    mockFetch(200, { id: 'p1', name: 'Headphones' });
    const result = await apiClient.get<{ id: string; name: string }>('/products/p1');
    expect(result).toEqual({ id: 'p1', name: 'Headphones' });
  });

  it('sends a JSON body on POST', async () => {
    mockFetch(201, { id: 'c1' });
    await apiClient.post('/customers', { fullName: 'Ana' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/customers'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ fullName: 'Ana' }),
      }),
    );
  });

  it('merges extra headers on POST', async () => {
    mockFetch(201, {});
    await apiClient.post('/transactions', { a: 1 }, { 'Idempotency-Key': 'k1' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers).toEqual({ 'Content-Type': 'application/json', 'Idempotency-Key': 'k1' });
  });

  it('sends no body on GET requests with no data', async () => {
    mockFetch(200, {});
    await apiClient.get('/products');
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.body).toBeUndefined();
  });

  it('throws ApiError with the response code, message, and details on failure', async () => {
    mockFetch(404, { code: 'PRODUCT_NOT_FOUND', message: 'Product not found', details: [{ issue: 'x' }] });

    await expect(apiClient.get('/products/missing')).rejects.toMatchObject({
      status: 404,
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product not found',
      details: [{ issue: 'x' }],
    });
    await expect(apiClient.get('/products/missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to defaults when the error body has no code or message', async () => {
    mockFetch(500, {});
    await expect(apiClient.get('/anything')).rejects.toMatchObject({
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: 'Request failed',
      details: [],
    });
  });

  it('falls back to defaults when the error body is not valid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    });
    await expect(apiClient.get('/anything')).rejects.toMatchObject({
      status: 500,
      code: 'UNKNOWN_ERROR',
    });
  });
});