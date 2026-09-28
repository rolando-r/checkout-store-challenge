import { useState } from 'react';
import type { ProductWithStock } from '../hooks/useProducts';
import { MAX_QUANTITY_PER_ORDER } from '../config';
import { formatMoney } from '../lib/money';
import { QuantityStepper } from './QuantityStepper';
import { ProductImage } from './ProductImage';
import styles from './ProductCard.module.css';

const LOW_STOCK_THRESHOLD = 5;

// One column up to 700px (full width), two columns after that (max 960px container).
const IMAGE_SIZES = '(min-width: 700px) 480px, 100vw';

interface ProductCardProps {
  product: ProductWithStock;
  onBuy: (product: ProductWithStock, quantity: number) => void;
  /** Above-the-fold card: its image is loaded eagerly with high priority. */
  priority?: boolean;
}

export function ProductCard({ product, onBuy, priority = false }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const outOfStock = product.availableUnits === 0;
  const lowStock = !outOfStock && product.availableUnits <= LOW_STOCK_THRESHOLD;
  // Cap at whichever is smaller: what's left in stock, or the per-order
  // limit the backend enforces. Otherwise a customer buying a well-stocked
  // product can pick a quantity that only fails once they reach payment.
  const maxOrderable = Math.max(Math.min(product.availableUnits, MAX_QUANTITY_PER_ORDER), 1);

  const badgeClassName = [
    styles.stockBadge,
    outOfStock ? styles.stockBadgeOut : '',
    lowStock ? styles.stockBadgeLow : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={styles.card}>
      <div className={styles.imageWrap}>
        <ProductImage src={product.imageUrl} alt={product.name} sizes={IMAGE_SIZES} priority={priority} />
        <span className={badgeClassName}>{outOfStock ? 'Out of stock' : `${product.availableUnits} in stock`}</span>
      </div>
      <div className={styles.body}>
        <h2 className={styles.name}>{product.name}</h2>
        <p className={styles.description}>{product.description}</p>
        <span className={styles.price}>{formatMoney(product.priceInCents, product.currency)}</span>
        <div className={styles.controls}>
          <QuantityStepper
            value={quantity}
            max={maxOrderable}
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
