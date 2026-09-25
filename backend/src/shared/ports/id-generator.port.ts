export interface IdGeneratorPort {
  newId(): string;
  /** Human-readable transaction number sent to the gateway, e.g. TXN-20260924-8F3K2Q */
  newReference(now: Date): string;
}