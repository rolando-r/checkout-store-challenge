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

`docker-compose.yml` at the repo root runs Postgres (and optionally the
backend) for you, so you don't need Postgres installed locally.

### Option A — Postgres in Docker, apps on the host (recommended for dev)

```bash
# 1. Start just the database
docker compose up -d postgres

# 2. Backend
cd backend
npm install
cp .env.example .env          # already points at the compose Postgres above
npm run migration:run
npm run seed
npm run start:dev             # http://localhost:3000  (Swagger UI at /docs)

# 3. Frontend, in a second terminal
cd frontend
npm install
cp .env.example .env          # points at the backend above by default
npm run dev                    # http://localhost:5173
```

Running the backend on the host (rather than in Docker) gives you hot
reload via `start:dev` — better for active development.

### Option B — Postgres + backend both in Docker

```bash
docker compose up -d --build   # starts postgres and the backend container

# migrations/seed still run from the host, against the now-published port:
cd backend
npm install
cp .env.example .env
npm run migration:run
npm run seed
```

The `backend` service builds from `backend/Dockerfile` (a production build —
`node dist/main`, no hot reload) and reads `backend/.env` via `env_file` for
the gateway keys, fees, etc.; `DATABASE_URL` is overridden by
`docker-compose.yml` to point at the `postgres` service's Docker network
hostname instead of `localhost`. The backend container does **not** run
migrations or seeding on startup, so that step is still manual either way.

The frontend isn't containerized in `docker-compose.yml` — run it on the
host with `npm run dev` as in Option A.

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

- `docker-compose.yml` is a **local development convenience only**
  (hardcoded Postgres password, no TLS, port 5432 published to the host) —
  it is not meant to be run as-is in production.
- Backend: `backend/Dockerfile` (multi-stage build) — point at a managed
  Postgres instance (e.g. AWS RDS) with real credentials via secrets, and
  serve behind HTTPS.
- Frontend: static build (`npm run build` in `frontend/`) deployable to any
  static host/CDN, pointed at the deployed backend via `VITE_API_BASE_URL`.
- Deployed URLs: _add here once published_.

## Security

- No raw card data (number/CVC) ever touches our backend or is persisted in
  the frontend's state — tokenization happens directly against the gateway
  from the browser.
- `helmet` security headers, strict request validation, and restricted CORS
  on the API. See [backend/README.md#security](./backend/README.md#security).