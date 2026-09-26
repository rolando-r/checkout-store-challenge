import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface CustomerState {
  id: string | null;
  fullName: string;
  email: string;
  phone: string;
}

const initialState: CustomerState = { id: null, fullName: '', email: '', phone: '' };

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    customerSaved(state, action: PayloadAction<CustomerState & { id: string }>) {
      state.id = action.payload.id;
      state.fullName = action.payload.fullName;
      state.email = action.payload.email;
      state.phone = action.payload.phone;
    },
    customerReset() {
      return initialState;
    },
  },
});

export const { customerSaved, customerReset } = customerSlice.actions;
export default customerSlice.reducer;