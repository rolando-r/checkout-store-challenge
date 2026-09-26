import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
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

// No raw card data ever enters this state tree — only brand/last4 for display.
const persistConfig = { key: 'checkout-store', storage, whitelist: ['product', 'customer', 'checkout', 'payment'] };
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] } }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;