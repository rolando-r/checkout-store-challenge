export const TransactionStatus = {
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Declined: 'DECLINED',
  Error: 'ERROR',
  Voided: 'VOIDED',
} as const;

export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

/** Once a transaction leaves PENDING, it can never change again. */
export const isTerminalStatus = (status: TransactionStatus): boolean =>
  status !== TransactionStatus.Pending;