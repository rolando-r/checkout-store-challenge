import { act, renderHook, waitFor } from '@testing-library/react';
import { apiClient, ApiError } from '../api/client';
import { useCheckoutConfig } from './useCheckoutConfig';

jest.mock('../api/client', () => ({
  apiClient: { get: jest.fn() },
  ApiError: jest.requireActual('../api/client').ApiError,
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const config = {
  currency: 'COP',
  baseFeeInCents: 300000,
  deliveryFeeInCents: 500000,
  gateway: { publicKey: 'pub_stagtest_123', acceptanceToken: 'accept_token_123' },
};

describe('useCheckoutConfig', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('starts in a loading state and then resolves with the checkout config', async () => {
    mockedGet.mockResolvedValueOnce(config);
    const { result } = renderHook(() => useCheckoutConfig());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.config).toEqual(config);
    expect(result.current.isError).toBe(false);
    expect(mockedGet).toHaveBeenCalledWith('/checkout/config');
  });

  it('surfaces the ApiError message when the request fails', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(503, 'GATEWAY_UNAVAILABLE', 'Checkout is unavailable'));
    const { result } = renderHook(() => useCheckoutConfig());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.config).toBeNull();
    expect(result.current.error).toBe('Checkout is unavailable');
  });

  it('falls back to a generic message for non-ApiError failures', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useCheckoutConfig());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe('Something went wrong while preparing checkout.');
  });

  it('refetch re-triggers the request and can recover from an error', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'boom'));
    const { result } = renderHook(() => useCheckoutConfig());

    await waitFor(() => expect(result.current.isError).toBe(true));

    mockedGet.mockResolvedValueOnce(config);
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.config).toEqual(config));
    expect(result.current.isError).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
