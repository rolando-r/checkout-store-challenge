import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/database/data-source';

let dataSource: DataSource;

export const getTestDataSource = async (): Promise<DataSource> => {
  if (!dataSource?.isInitialized) {
    dataSource = await AppDataSource.initialize();
  }
  return dataSource;
};

export const closeTestDataSource = async (): Promise<void> => {
  if (dataSource?.isInitialized) await dataSource.destroy();
};

/** Truncates every table between tests so each test starts from a clean slate. */
export const cleanDatabase = async (ds: DataSource): Promise<void> => {
  const tables = ['idempotency_keys', 'deliveries', 'transactions', 'stock', 'customers', 'products'];
  await ds.query(`TRUNCATE ${tables.join(', ')} RESTRICT`);
};