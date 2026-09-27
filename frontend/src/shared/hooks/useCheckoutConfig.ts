import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/client';

export interface CheckoutConfig {
  currency: string;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  gateway: { publicKey: string; acceptanceToken: string };
}

type Status = 'idle' | 'loading' | 'success' | 'error';

interface UseCheckoutConfigState {
  status: Status;
  config: CheckoutConfig | null;
  error: string | null;
}

const initialState: UseCheckoutConfigState = { status: 'idle', config: null, error: null };

/**
 * Fetches store fees and the payment gateway's public key / acceptance
 * token needed to tokenize a card client-side. Same plain-hook shape as
 * useProducts, for the same reason: a handful of read-only endpoints
 * don't need a second data-fetching layer on top of Redux.
 */
export function useCheckoutConfig() {
  const [state, setState] = useState<UseCheckoutConfigState>(initialState);

  const fetchConfig = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const config = await apiClient.get<CheckoutConfig>('/checkout/config');
      setState({ status: 'success', config, error: null });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong while preparing checkout.';
      setState({ status: 'error', config: null, error: message });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig();
  }, [fetchConfig]);

  return {
    config: state.config,
    isLoading: state.status === 'loading' || state.status === 'idle',
    isError: state.status === 'error',
    error: state.error,
    refetch: fetchConfig,
  };
}
