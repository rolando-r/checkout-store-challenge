import { act, renderHook, waitFor } from '@testing-library/react';
import { apiClient, ApiError } from '../api/client';
import { useProducts } from './useProducts';

jest.mock('../api/client', () => ({
  apiClient: { get: jest.fn() },
  ApiError: jest.requireActual('../api/client').ApiError,
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const product = {
  id: 'p1',
  name: 'Headphones',
  description: 'd',
  priceInCents: 1000,
  currency: 'COP',
  imageUrl: 'x.png',
  availableUnits: 5,
};

describe('useProducts', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('starts in a loading state and then resolves with the product list', async () => {
    mockedGet.mockResolvedValueOnce([product]);
    const { result } = renderHook(() => useProducts());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toEqual([product]);
    expect(result.current.isError).toBe(false);
    expect(mockedGet).toHaveBeenCalledWith('/products');
  });

  it('surfaces the ApiError message when the request fails', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'Products are unavailable'));
    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBe('Products are unavailable');
  });

  it('falls back to a generic message for non-ApiError failures', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe('Something went wrong while loading products.');
  });

  it('refetch re-triggers the request and can recover from an error', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'boom'));
    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isError).toBe(true));

    mockedGet.mockResolvedValueOnce([product]);
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.products).toEqual([product]));
    expect(result.current.isError).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});