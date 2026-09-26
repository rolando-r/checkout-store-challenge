import type { ReactElement } from 'react';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import productReducer from '../features/product/productSlice';
import customerReducer from '../features/customer/customerSlice';
import checkoutReducer from '../features/checkout/checkoutSlice';
import paymentReducer from '../features/payment/paymentSlice';

const rootReducer = combineReducers({
  product: productReducer,
  customer: customerReducer,
  checkout: checkoutReducer,
  payment: paymentReducer,
});

export type TestRootState = ReturnType<typeof rootReducer>;

export function renderWithProviders(
  ui: ReactElement,
  options: { preloadedState?: Partial<TestRootState>; route?: string } = {},
) {
  const { preloadedState, route = '/' } = options;
  const store = configureStore({ reducer: rootReducer, preloadedState });
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
}