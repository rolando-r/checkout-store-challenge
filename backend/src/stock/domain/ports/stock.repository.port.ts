export interface StockRepositoryPort {
  getAvailable(productId: string): Promise<number>;
  /** Atomic: UPDATE ... WHERE quantity >= :qty. Returns false when stock ran out. */
  decrementIfAvailable(productId: string, quantity: number): Promise<boolean>;
}