import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../app/hooks';
import { productSelected, quantityChanged } from '../features/product/productSlice';
import { useProducts, type ProductWithStock } from '../shared/hooks/useProducts';
import { ProductCard } from '../shared/components/ProductCard';
import styles from './ProductPage.module.css';

export function ProductPage() {
  const { products, isLoading, isError, error, refetch } = useProducts();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleBuy = (product: ProductWithStock, quantity: number) => {
    dispatch(productSelected(product));
    dispatch(quantityChanged(quantity));
    navigate('/checkout');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.badge}>Secure checkout</span>
          <h1 className={styles.title}>Store</h1>
          <p className={styles.subtitle}>Pick a product and pay securely with your credit card.</p>
        </div>
      </header>

      <div className={styles.content}>
        {isLoading && <p className={styles.status}>Loading products…</p>}

        {isError && (
          <div className={styles.errorBox}>
            <p className={styles.errorMessage}>{error}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && products.length === 0 && (
          <p className={styles.status}>There are no products available right now.</p>
        )}

        {!isLoading && !isError && products.length > 0 && (
          <ul className={styles.list}>
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} onBuy={handleBuy} priority={index === 0} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
