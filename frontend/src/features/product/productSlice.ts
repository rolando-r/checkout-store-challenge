import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SelectedProduct {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  imageUrl: string;
  availableUnits: number;
}

interface ProductState {
  selected: SelectedProduct | null;
  quantity: number;
}

const initialState: ProductState = { selected: null, quantity: 1 };

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    productSelected(state, action: PayloadAction<SelectedProduct>) {
      state.selected = action.payload;
      state.quantity = 1;
    },
    quantityChanged(state, action: PayloadAction<number>) {
      state.quantity = action.payload;
    },
    productReset() {
      return initialState;
    },
  },
});

export const { productSelected, quantityChanged, productReset } = productSlice.actions;
export default productSlice.reducer;