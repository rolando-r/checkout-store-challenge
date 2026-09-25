import { ErrorDetail, ValidationError } from '../../shared/errors/domain-error';
import { IdGeneratorPort } from '../../shared/ports/id-generator.port';
import { err, ok, Result } from '../../shared/rop/result';
import { CustomerRepositoryPort } from '../domain/ports/customer.repository.port';
import { Customer } from '../domain/customer.types';

export interface UpsertCustomerInput {
  fullName: string;
  email: string;
  phone: string;
}

export interface UpsertCustomerOutput {
  customer: Customer;
  created: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLOMBIAN_MOBILE_PATTERN = /^3\d{9}$/;

export interface UpsertCustomerDeps {
  customers: CustomerRepositoryPort;
  ids: IdGeneratorPort;
}

export class UpsertCustomerUseCase {
  constructor(private readonly deps: UpsertCustomerDeps) {}

  async execute(
    input: UpsertCustomerInput,
  ): Promise<Result<UpsertCustomerOutput, ValidationError>> {
    const validated = this.validate(input);
    if (!validated.ok) return validated;

    const { fullName, email, phone } = validated.value;
    const existing = await this.deps.customers.findByEmail(email);

    const customer: Customer = {
      id: existing?.id ?? this.deps.ids.newId(),
      fullName,
      email,
      phone,
    };
    await this.deps.customers.save(customer);

    return ok({ customer, created: !existing });
  }

  private validate(
    input: UpsertCustomerInput,
  ): Result<UpsertCustomerInput, ValidationError> {
    const issues: ErrorDetail[] = [];
    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();

    if (fullName.length < 3 || fullName.length > 120) {
      issues.push({ field: 'fullName', issue: 'must be between 3 and 120 characters' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      issues.push({ field: 'email', issue: 'must be a valid email address' });
    }
    if (!COLOMBIAN_MOBILE_PATTERN.test(phone)) {
      issues.push({ field: 'phone', issue: 'must be a 10-digit Colombian mobile number' });
    }

    return issues.length > 0
      ? err(new ValidationError(issues))
      : ok({ fullName, email, phone });
  }
}