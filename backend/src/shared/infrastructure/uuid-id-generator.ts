import { randomUUID } from 'node:crypto';
import { IdGeneratorPort } from '../ports/id-generator.port';

export class UuidIdGenerator implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }

  newReference(now: Date): string {
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomUUID().split('-')[0].toUpperCase();
    return `TXN-${date}-${suffix}`;
  }
}