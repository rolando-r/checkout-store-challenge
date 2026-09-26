import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const TransactionStatus = {
  Pending: 'PENDING', Approved: 'APPROVED', Declined: 'DECLINED', Error: 'ERROR', Voided: 'VOIDED',
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

interface PaymentState {
  transactionId: string | null;
  reference: string | null;
  status: TransactionStatus | null;
  statusMessage: string | null;
  totalAmountInCents: number | null;
}

const initialState: PaymentState = {
  transactionId: null, reference: null, status: null, statusMessage: null, totalAmountInCents: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    transactionCreated(state, action: PayloadAction<{ id: string; reference: string; totalAmountInCents: number }>) {
      state.transactionId = action.payload.id;
      state.reference = action.payload.reference;
      state.totalAmountInCents = action.payload.totalAmountInCents;
      state.status = TransactionStatus.Pending;
    },
    transactionStatusUpdated(state, action: PayloadAction<{ status: TransactionStatus; statusMessage: string | null }>) {
      state.status = action.payload.status;
      state.statusMessage = action.payload.statusMessage;
    },
    paymentReset() {
      return initialState;
    },
  },
});

export const { transactionCreated, transactionStatusUpdated, paymentReset } = paymentSlice.actions;
export default paymentSlice.reducer;