import { Customer } from '../customer.types';

export interface CustomerRepositoryPort {
  exists(id: string): Promise<boolean>;
  findByEmail(email: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}