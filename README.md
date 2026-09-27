# Checkout Store

A full-stack onboarding flow for buying a single product with a credit card:
browse a product and its stock, enter delivery and card details, review a
summary, pay through the gateway, and see the result — with the product's
stock updated at the end.

```
1. Product page → 2. Delivery & card → 3. Summary → 4. Result → 5. Product page
```

| Part                          | Stack                                   | README |
|---------------------------------|-------------------------------------------|--------|
| [`frontend/`](./frontend)      | React 19 + TypeScript, Redux Toolkit, Vite | [frontend/README.md](./frontend/README.md) |
| [`backend/`](./backend)        | NestJS + TypeScript, PostgreSQL, TypeORM   | [backend/README.md](./backend/README.md)   |

## Quick start

`docker-compose.yml` at the repo root provides PostgreSQL, the backend API, and the production-built frontend.

### Option A — Apps on the host, Postgres in Docker (recommended for development)

```bash
# 1. Start the database
docker compose up -d postgres

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run migration:run
npm run seed
npm run start:dev
# http://localhost:3000
# Swagger: http://localhost:3000/docs

# 3. Frontend, in a second terminal
cd frontend
npm install
cp .env.example .env
npm run dev
# http://localhost:5173
```

Running the applications on the host provides hot reload and is better suited
for active development.

### Option B — Full stack in Docker

```bash
docker compose up -d --build
```

This starts:

| Service     | Container  |   Port |
| ----------- | ---------- | -----: |
| PostgreSQL  | `postgres` | `5432` |
| Backend API | `backend`  | `3000` |
| Frontend    | `frontend` | `8080` |

The frontend is built with Vite and served as a static application through
Nginx.

Open the application at:

```text
http://localhost:8080
```

The frontend Docker image uses a multi-stage build:

1. **Build stage** — Node.js installs dependencies and runs `npm run build`.
2. **Runtime stage** — Nginx serves the generated `dist/` files.

The frontend build accepts these Vite variables as Docker build arguments:

```text
VITE_API_BASE_URL
VITE_WOMPI_API_URL
```

For example:

```bash
docker compose build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000 \
  --build-arg VITE_WOMPI_API_URL=https://api-sandbox.co.uat.wompi.dev/v1 \
  frontend

docker compose up -d
```

The Nginx configuration also provides:

* SPA fallback to `index.html`, allowing refreshes on `/checkout`,
  `/summary`, and `/result`.
* Long-term caching for Vite content-hashed assets.
* `Cache-Control: no-cache` for the SPA entry point.
* Security headers including CSP, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy.

The backend container does not automatically run migrations or seed data.
Run those commands from the host after the containers are started:

```bash
cd backend
npm install
cp .env.example .env
npm run migration:run
npm run seed
```

### Option C — Frontend only with Docker

The frontend can also be built independently from the repository root:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000 \
  --build-arg VITE_WOMPI_API_URL=https://api-sandbox.co.uat.wompi.dev/v1 \
  -t checkout-store-frontend ./frontend

docker run --rm -p 8080:8080 checkout-store-frontend
```

Then open:

```text
http://localhost:8080
```

## API documentation

- **Swagger UI:** `http://localhost:3000/docs` (or `<deployed-backend-url>/docs`)
- **OpenAPI JSON, importable as a Postman collection:** `http://localhost:3000/docs-json`

Full endpoint list and import instructions: [backend/README.md](./backend/README.md#api-documentation-postman--swagger).

## Data model

See the entity-relationship diagram and design rationale in
[backend/README.md](./backend/README.md#data-model).

## Architecture

- **Backend:** Hexagonal Architecture (Ports & Adapters) per module —
  `domain` → `application` → `infrastructure` — with business rules written
  as Railway-Oriented Programming (`Result<T, E>` pipelines), so expected
  failures are values, not exceptions. Details: [backend/README.md](./backend/README.md#architecture-hexagonal--ports--adapters).
- **Frontend:** feature-based Redux slices (Flux architecture) persisted to
  `localStorage`, route guards enforcing the 5-step order, and a resilient
  session that survives a refresh mid-checkout. Details: [frontend/README.md](./frontend/README.md#state--resilience).

## Testing & coverage

Both apps are unit-tested with Jest; the backend also has integration and
e2e suites. Coverage tables live in each app's README:

- [frontend/README.md#testing--coverage](./frontend/README.md#testing--coverage)
- [backend/README.md#testing--coverage](./backend/README.md#testing--coverage)

## Deployment

* `docker-compose.yml` is a **local development convenience only**
  (hardcoded Postgres password, no TLS, and port 5432 published to the host).
  It is not intended to be used as-is in production.
* **Backend:** `backend/Dockerfile` uses a multi-stage production build.
  Point it at a managed PostgreSQL instance with real credentials supplied
  through secrets and serve it behind HTTPS.
* **Frontend:** `frontend/Dockerfile` uses a multi-stage Node.js + Nginx build.
  The resulting image contains only the compiled Vite application and Nginx
  runtime.
* **Frontend configuration:** `VITE_API_BASE_URL` and `VITE_WOMPI_API_URL`
  are injected at build time because Vite embeds `VITE_*` variables into the
  generated frontend bundle.
* **Nginx:** the production frontend serves on port `8080`, provides SPA
  routing fallback, caches hashed assets, and applies security headers.
* **Deployed URLs:** *add here once published*.

## Security

- No raw card data (number/CVC) ever touches our backend or is persisted in
  the frontend's state — tokenization happens directly against the gateway
  from the browser.
- `helmet` security headers, strict request validation, and restricted CORS
  on the API. See [backend/README.md#security](./backend/README.md#security).