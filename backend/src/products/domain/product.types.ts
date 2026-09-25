export interface Product {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  imageUrl: string;
}

export interface ProductWithStock extends Product {
  availableUnits: number;
}