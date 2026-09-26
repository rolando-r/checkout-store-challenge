import { Repository } from 'typeorm';
import { CustomerRepositoryPort } from '../../domain/ports/customer.repository.port';
import { Customer } from '../../domain/customer.types';
import { CustomerOrmEntity } from './customer.orm-entity';

export class TypeOrmCustomerRepository implements CustomerRepositoryPort {
  constructor(private readonly repo: Repository<CustomerOrmEntity>) {}

  async exists(id: string): Promise<boolean> {
    return (await this.repo.countBy({ id })) > 0;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const row = await this.repo.findOneBy({ email });
    return row ?? null;
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.repo.findOneBy({ id });
    return row ?? null;
  }

  async save(customer: Customer): Promise<void> {
    await this.repo.save(customer);
  }
}