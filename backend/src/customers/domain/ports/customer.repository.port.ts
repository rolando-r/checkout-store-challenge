export interface CustomerRepositoryPort {
  exists(id: string): Promise<boolean>;
}