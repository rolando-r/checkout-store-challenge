import { ValidationError } from '../../shared/errors/domain-error';
import { unwrap, unwrapErr } from '../../shared/testing/result-helpers';
import { CustomerRepositoryPort } from '../domain/ports/customer.repository.port';
import { UpsertCustomerUseCase } from './upsert-customer.use-case';

const input = { fullName: 'Ana Pérez', email: 'Ana@Example.com', phone: '3001234567' };

const build = () => {
  const customers: jest.Mocked<CustomerRepositoryPort> = {
    exists: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const ids = { newId: () => 'cust-1', newReference: () => 'ref' };
  return { customers, useCase: new UpsertCustomerUseCase({ customers, ids }) };
};

describe('UpsertCustomerUseCase', () => {
  it('creates a new customer with a normalized email', async () => {
    const { customers, useCase } = build();

    const output = unwrap(await useCase.execute(input));

    expect(output.created).toBe(true);
    expect(output.customer).toEqual({
      id: 'cust-1', fullName: 'Ana Pérez', email: 'ana@example.com', phone: '3001234567',
    });
    expect(customers.save).toHaveBeenCalledWith(output.customer);
  });

  it('updates the existing customer when the email is already registered', async () => {
    const { customers, useCase } = build();
    customers.findByEmail.mockResolvedValue({
      id: 'existing-1', fullName: 'Old Name', email: 'ana@example.com', phone: '3009999999',
    });

    const output = unwrap(await useCase.execute(input));

    expect(output.created).toBe(false);
    expect(output.customer.id).toBe('existing-1');
    expect(output.customer.fullName).toBe('Ana Pérez');
  });

  const invalidCases: Array<[string, Partial<typeof input>, string]> = [
    ['a short name', { fullName: 'An' }, 'fullName'],
    ['a malformed email', { email: 'not-an-email' }, 'email'],
    ['a non-mobile phone', { phone: '6011234567' }, 'phone'],
    ['a short phone', { phone: '300123' }, 'phone'],
  ];

  it.each(invalidCases)('rejects %s', async (_label, override, field) => {
    const { customers, useCase } = build();
    const error = unwrapErr(await useCase.execute({ ...input, ...override }));
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual([expect.objectContaining({ field })]);
    expect(customers.findByEmail).not.toHaveBeenCalled();
  });
});