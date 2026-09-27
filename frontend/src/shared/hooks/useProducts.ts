import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/client';
import type { SelectedProduct } from '../../features/product/productSlice';

export type ProductWithStock = SelectedProduct;

type Status = 'idle' | 'loading' | 'success' | 'error';

interface UseProductsState {
  status: Status;
  products: ProductWithStock[];
  error: string | null;
}

const initialState: UseProductsState = { status: 'idle', products: [], error: null };

/**
 * Fetches the product catalog from the backend.
 * Deliberately a plain hook rather than RTK Query: for a handful of read-only
 * endpoints across 5 screens, a second data-fetching paradigm on top of the
 * Redux slices already in use would add more surface area than it saves.
 */
export function useProducts() {
  const [state, setState] = useState<UseProductsState>(initialState);

  const fetchProducts = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const products = await apiClient.get<ProductWithStock[]>('/products');
      setState({ status: 'success', products, error: null });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong while loading products.';
      setState({ status: 'error', products: [], error: message });
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products: state.products,
    isLoading: state.status === 'loading' || state.status === 'idle',
    isError: state.status === 'error',
    error: state.error,
    refetch: fetchProducts,
  };
}
