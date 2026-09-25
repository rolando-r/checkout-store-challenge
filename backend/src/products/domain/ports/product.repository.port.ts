import { Product } from '../product.types';

export interface ProductRepositoryPort {
  findById(id: string): Promise<Product | null>;
}