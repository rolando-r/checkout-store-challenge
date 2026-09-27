# Checkout Store — Frontend

Single-page React app for the "Pay with credit card" onboarding flow: browse
a product, enter delivery + card details, review a summary, pay, and see the
result. Built with React 19, Redux Toolkit and React Router, written in
TypeScript, tested with Jest + React Testing Library.

Backend API lives in [`../backend`](../backend) — see that README for the
API reference, data model and Postman/Swagger info.

## Tech stack

| Concern            | Choice                                    |
|--------------------|-------------------------------------------|
| Framework          | React 19 + Vite                           |
| Language           | TypeScript                                |
| State (Flux)       | Redux Toolkit (`@reduxjs/toolkit`)        |
| Persistence        | `redux-persist` → `window.localStorage`   |
| Routing            | React Router v7                           |
| Styling            | CSS Modules, flexbox, design tokens       |
| Testing            | Jest + React Testing Library              |

## Business flow (5 screens)

```
1. Product page  →  2. Delivery & card  →  3. Summary  →  4. Result  →  5. Product page
```

| # | Route        | Page             | What happens |
|---|--------------|------------------|--------------|
| 1 | `/`          | `ProductPage`    | Lists products with stock, description and price from the backend. Picking a quantity and clicking buy stores the selection in Redux and navigates on. |
| 2 | `/checkout`  | `CheckoutPage`   | Collects the customer's contact info, delivery address and card details. Card number/CVC are validated client-side (Luhn + expiry) and detected as Visa/Mastercard as you type. On submit: creates/updates the customer, tokenizes the card directly against the payment gateway, then moves on. |
| 3 | `/summary`   | `SummaryPage`    | Shows product + delivery + masked card recap and the fee breakdown (product, base fee, delivery fee, total) behind a backdrop while paying. Clicking pay creates a `PENDING` transaction in the backend, then asks it to charge the card. |
| 4 | `/result`    | `ResultPage`     | Shows the final transaction status (approved / declined / error / voided / pending) with the reference and amount charged. |
| 5 | `/` again    | `ProductPage`    | "Back to store" clears the whole checkout session and returns to the product list, which re-fetches stock from the backend so the updated quantity is reflected. |

Route guards (`src/app/guards/`) prevent skipping ahead: `/checkout` requires
a selected product, `/summary` requires delivery details, `/result` requires
a transaction to exist — typing a URL directly redirects back to the right
step.

## State & resilience

All checkout state lives in four Redux slices (`product`, `customer`,
`checkout`, `payment`), combined into one store and persisted to
`localStorage` via `redux-persist` (see `src/app/store.ts`). Refreshing the
browser mid-flow restores exactly where the customer was — this is what
satisfies the "app must be resilient" requirement.

**Never persisted:** the raw card number and CVC. They only ever exist
in local component state on `CheckoutPage`, are sent straight from the
browser to the gateway's tokenization endpoint, and only the resulting
single-use token (handed off via router `location.state`, not Redux) plus
the card brand/last 4 digits for display are kept afterwards. A page
refresh on the summary screen loses the token on purpose and asks the
customer to re-enter their card.

## Getting started

```bash
npm install
cp .env.example .env   # point at your backend, see below
npm run dev            # http://localhost:5173
```

The backend must be running (see `../backend/README.md`) for product data,
checkout config and payment endpoints to resolve.

### Environment variables

See [`.env.example`](./.env.example).

| Variable               | Purpose                                                                           | Default (dev)                         |
|------------------------|-----------------------------------------------------------------------------------|---------------------------------------|
| `VITE_API_BASE_URL`    | Base URL of the backend API                                                       | `http://localhost:3000`               |
| `VITE_GATEWAY_API_URL` | Payment gateway sandbox base URL for direct browser→gateway card tokenization     | `https://api-sandbox.example.dev/v1`  |

## Scripts

| Command             | Does                                         |
|---------------------|----------------------------------------------|
| `npm run dev`       | Start the Vite dev server                    |
| `npm run build`     | Type-check and produce a production build    |
| `npm run preview`   | Serve the production build locally           |
| `npm run lint`      | Run ESLint                                   |
| `npm test`          | Run the Jest test suite                      |
| `npm run test:watch`| Run tests in watch mode                      |
| `npm run test:cov`  | Run tests with a coverage report             |

## Testing & coverage

Every slice, hook, shared lib and page has a co-located `*.spec.ts(x)` file.
Component tests render through `react-redux` + `MemoryRouter` via the shared
`renderWithProviders` helper in `src/test/render.tsx`, so pages are tested
against real reducers rather than mocked state.

Latest local run (`npm run test:cov`):

| Metric      | Coverage |
|-------------|----------|
| Statements  | 100%     |
| Branches    | 95.5%    |
| Functions   | 100%     |
| Lines       | 100%     |

20 suites / 102 tests, all passing — comfortably above the 80% bar required
by the test brief. Re-run `npm run test:cov` to regenerate this table if the
code changes.

## Project structure

```
src/
├── app/                 # Store, hooks, router, route guards
│   └── guards/          # RequireProduct / RequireDeliveryDetails / RequireTransaction
├── features/            # Redux slices, one folder per domain concern
│   ├── product/
│   ├── customer/
│   ├── checkout/
│   └── payment/
├── pages/               # One component per screen (Product/Checkout/Summary/Result)
├── shared/
│   ├── api/             # Backend API client + payment gateway tokenization client
│   ├── components/      # ProductCard, QuantityStepper
│   ├── hooks/           # useProducts, useCheckoutConfig
│   ├── lib/             # card.ts (Luhn/brand/expiry), money.ts (formatting)
│   ├── storage/         # localStorage adapter for redux-persist
│   └── styles/          # tokens.css (design tokens shared by every page)
└── test/                # renderWithProviders + Jest setup
```

## Responsive design

Mobile-first CSS Modules with a single breakpoint (`700px`) scaling up
typography/padding for larger screens; layouts use flexbox and `100svh` so
they behave correctly down to small phone viewports (validated against the
iPhone SE (2020) reference size from the brief).

## Security notes

- Raw card data never enters Redux state or `localStorage` (see above).
- All rendering goes through React's default escaping — no
  `dangerouslySetInnerHTML` anywhere in the codebase.
- The backend enforces the real prices/fees; the frontend only displays
  what the API returns.