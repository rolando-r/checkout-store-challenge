import { api } from './support/api-client';

describe('Products (e2e)', () => {
  it('GET /products returns the seeded catalog with stock', async () => {
    const response = await api().get('/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        priceInCents: expect.any(Number),
        availableUnits: expect.any(Number),
      }),
    );
  });

  it('GET /products/:id returns 404 for an unknown product', async () => {
    const response = await api().get('/products/00000000-0000-0000-0000-000000000000');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('PRODUCT_NOT_FOUND');
  });
});