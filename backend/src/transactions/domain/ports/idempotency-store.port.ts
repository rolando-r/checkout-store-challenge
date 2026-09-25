export interface IdempotencyRecord {
  requestHash: string;
  transactionId: string;
}

export interface IdempotencyStorePort {
  find(scope: string, key: string): Promise<IdempotencyRecord | null>;
  save(scope: string, key: string, record: IdempotencyRecord): Promise<void>;
}