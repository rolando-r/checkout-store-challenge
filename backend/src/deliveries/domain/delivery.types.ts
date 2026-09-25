export const DeliveryStatus = {
  Assigned: 'ASSIGNED',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export interface Delivery {
  id: string;
  transactionId: string;
  customerId: string;
  productId: string;
  addressLine: string;
  city: string;
  department: string;
  postalCode?: string;
  status: DeliveryStatus;
}