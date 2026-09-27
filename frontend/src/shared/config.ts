export const config = {
  apiBaseUrl: process.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  // Card tokenization happens straight from the browser to Wompi, so raw
  // card data never transits through our own backend.
  wompiApiUrl: process.env.VITE_WOMPI_API_URL ?? 'https://api-sandbox.co.uat.wompi.dev/v1',
};

// Must match MAX_QUANTITY_PER_ORDER in backend/src/transactions/application/
// create-transaction.use-case.ts. The backend is the source of truth and
// enforces this regardless, but mirroring it here lets the UI cap the
// quantity stepper up front instead of letting the customer fill in contact,
// delivery and card details and only then discover the order was rejected
// once they hit "Pay".
export const MAX_QUANTITY_PER_ORDER = 5;