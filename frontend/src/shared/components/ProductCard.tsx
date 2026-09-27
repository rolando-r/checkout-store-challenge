import { useState } from 'react';
import type { ProductWithStock } from '../hooks/useProducts';
import { formatMoney } from '../lib/money';
import { QuantityStepper } from './QuantityStepper';
import styles from './ProductCard.module.css';

const LOW_STOCK_THRESHOLD = 5;

interface ProductCardProps {
  product: ProductWithStock;
  onBuy: (product: ProductWithStock, quantity: number) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const outOfStock = product.availableUnits === 0;
  const lowStock = !outOfStock && product.availableUnits <= LOW_STOCK_THRESHOLD;

  return (
    <li className={styles.card}>
      <img className={styles.image} src={product.imageUrl} alt={product.name} loading="lazy" />
      <div className={styles.body}>
        <h2 className={styles.name}>{product.name}</h2>
        <p className={styles.description}>{product.description}</p>
        <div className={styles.meta}>
          <span className={styles.price}>{formatMoney(product.priceInCents, product.currency)}</span>
          <span className={`${styles.stock} ${lowStock ? styles.stockLow : ''}`}>
            {outOfStock ? 'Out of stock' : `${product.availableUnits} in stock`}
          </span>
        </div>
        <div className={styles.controls}>
          <QuantityStepper
            value={quantity}
            max={Math.max(product.availableUnits, 1)}
            onChange={setQuantity}
            disabled={outOfStock}
            label={`${product.name} quantity`}
          />
          <button
            type="button"
            className={styles.buyButton}
            disabled={outOfStock}
            onClick={() => onBuy(product, quantity)}
          >
            {outOfStock ? 'Unavailable' : 'Pay with credit card'}
          </button>
        </div>
      </div>
    </li>
  );
}
