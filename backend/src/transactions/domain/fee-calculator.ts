export interface FeeBreakdown {
  productAmountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
}

export interface Quote extends FeeBreakdown {
  totalAmountInCents: number;
}

/**
 * Recomputes the total server-side. The base fee and delivery fee are
 * store policy, never sent by the client, so this is the single source
 * of truth for what a customer owes.
 */
export const calculateQuote = (
  unitPriceInCents: number,
  quantity: number,
  baseFeeInCents: number,
  deliveryFeeInCents: number,
): Quote => {
  const productAmountInCents = unitPriceInCents * quantity;
  return {
    productAmountInCents,
    baseFeeInCents,
    deliveryFeeInCents,
    totalAmountInCents:
      productAmountInCents + baseFeeInCents + deliveryFeeInCents,
  };
};