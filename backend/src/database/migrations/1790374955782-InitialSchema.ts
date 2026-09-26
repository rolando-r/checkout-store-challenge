import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790374955782 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        price_in_cents BIGINT NOT NULL CHECK (price_in_cents > 0),
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        image_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE stock (
        product_id UUID PRIMARY KEY REFERENCES products(id),
        quantity INT NOT NULL CHECK (quantity >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE TYPE transaction_status AS ENUM ('PENDING','APPROVED','DECLINED','ERROR','VOIDED')`);

    await queryRunner.query(`
      CREATE TABLE transactions (
        id UUID PRIMARY KEY,
        reference VARCHAR(40) NOT NULL UNIQUE,
        product_id UUID NOT NULL REFERENCES products(id),
        customer_id UUID NOT NULL REFERENCES customers(id),
        quantity INT NOT NULL CHECK (quantity > 0),
        product_amount_in_cents BIGINT NOT NULL,
        base_fee_in_cents BIGINT NOT NULL,
        delivery_fee_in_cents BIGINT NOT NULL,
        total_amount_in_cents BIGINT NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'COP',
        status transaction_status NOT NULL DEFAULT 'PENDING',
        gateway_transaction_id VARCHAR(60),
        gateway_status_message TEXT,
        card_brand VARCHAR(20),
        card_last4 CHAR(4),
        delivery_address JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE TYPE delivery_status AS ENUM ('ASSIGNED','SHIPPED','DELIVERED')`);

    await queryRunner.query(`
      CREATE TABLE deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id),
        customer_id UUID NOT NULL REFERENCES customers(id),
        product_id UUID NOT NULL REFERENCES products(id),
        address_line VARCHAR(200) NOT NULL,
        city VARCHAR(80) NOT NULL,
        department VARCHAR(80) NOT NULL,
        postal_code VARCHAR(10),
        status delivery_status NOT NULL DEFAULT 'ASSIGNED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE idempotency_keys (
        scope VARCHAR(60) NOT NULL,
        idempotency_key VARCHAR(64) NOT NULL,
        request_hash VARCHAR(64) NOT NULL,
        transaction_id UUID NOT NULL,
        PRIMARY KEY (scope, idempotency_key)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE idempotency_keys`);
    await queryRunner.query(`DROP TABLE deliveries`);
    await queryRunner.query(`DROP TYPE delivery_status`);
    await queryRunner.query(`DROP TABLE transactions`);
    await queryRunner.query(`DROP TYPE transaction_status`);
    await queryRunner.query(`DROP TABLE customers`);
    await queryRunner.query(`DROP TABLE stock`);
    await queryRunner.query(`DROP TABLE products`);
  }
}