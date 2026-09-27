export const config = {
  apiBaseUrl: process.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  // Card tokenization happens straight from the browser to Wompi, so raw
  // card data never transits through our own backend.
  wompiApiUrl: process.env.VITE_WOMPI_API_URL ?? 'https://api-sandbox.co.uat.wompi.dev/v1',
};