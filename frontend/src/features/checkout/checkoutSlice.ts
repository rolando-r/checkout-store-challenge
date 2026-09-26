import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const CheckoutStep = {
  Product: 'PRODUCT',
  DeliveryAndCard: 'DELIVERY_AND_CARD',
  Summary: 'SUMMARY',
  Result: 'RESULT',
} as const;
export type CheckoutStep = (typeof CheckoutStep)[keyof typeof CheckoutStep];

export interface DeliveryAddress {
  addressLine: string;
  city: string;
  department: string;
  postalCode?: string;
}

interface CheckoutState {
  step: CheckoutStep;
  deliveryAddress: DeliveryAddress | null;
  cardBrand: string | null;
  cardLast4: string | null;
  idempotencyKey: string | null;
}

const initialState: CheckoutState = {
  step: CheckoutStep.Product,
  deliveryAddress: null,
  cardBrand: null,
  cardLast4: null,
  idempotencyKey: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    stepChanged(state, action: PayloadAction<CheckoutStep>) {
      state.step = action.payload;
    },
    deliveryDetailsSubmitted(
      state,
      action: PayloadAction<{ address: DeliveryAddress; cardBrand: string; cardLast4: string }>,
    ) {
      state.deliveryAddress = action.payload.address;
      state.cardBrand = action.payload.cardBrand;
      state.cardLast4 = action.payload.cardLast4;
      state.idempotencyKey = crypto.randomUUID();
      state.step = CheckoutStep.Summary;
    },
    checkoutReset() {
      return initialState;
    },
  },
});

export const { stepChanged, deliveryDetailsSubmitted, checkoutReset } = checkoutSlice.actions;
export default checkoutSlice.reducer;