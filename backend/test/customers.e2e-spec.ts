import { api } from './support/api-client';

describe('Customers (e2e)', () => {
  const email = `e2e-${Date.now()}@example.com`;

  it('creates a new customer', async () => {
    const response = await api().post('/customers').send({
      fullName: 'Ana Pérez', email, phone: '3001234567',
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ id: expect.any(String), email }));
  });

  it('upserts on the same email', async () => {
    const response = await api().post('/customers').send({
      fullName: 'Ana P. Updated', email, phone: '3009999999',
    });
    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe('Ana P. Updated');
  });

  it('rejects an invalid phone', async () => {
    const response = await api().post('/customers').send({
      fullName: 'Bad Phone', email: `bad-${Date.now()}@example.com`, phone: '123',
    });
    expect(response.status).toBe(400);
  });
});