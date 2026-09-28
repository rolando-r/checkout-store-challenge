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
| [`infra/`](./infra)            | Terraform (AWS: EC2, RDS, CloudFront)      | [Deployment (AWS)](#deployment-aws)        |

## Quick start

`docker-compose.yml` at the repo root provides PostgreSQL, the backend API, and the production-built frontend.

Gateway configuration: The .env.example files use default gateway values. Update the gateway environment variables with the credentials and API URL provided by your payment gateway to connect to the desired environment. When using Docker, the frontend gateway configuration must be provided at build time.

### Option A — Apps on the host, Postgres in Docker (recommended for development)

```bash
# 1. Backend environment
cd backend
npm install
cp .env.example .env

# 2. Start the database
cd ..
docker compose up -d postgres

# 3. Run migrations and seed
cd backend
npm run migration:run
npm run seed
npm run start:dev
# http://localhost:3000
# Swagger: http://localhost:3000/docs

# 4. Frontend, in a second terminal
cd frontend
npm install
cp .env.example .env
npm run dev
# http://localhost:5173
```

Gateway configuration: The .env.example files use placeholder/sandbox gateway values. Update the gateway environment variables with the credentials and API URL provided by your payment gateway to connect to the desired environment.

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
VITE_GATEWAY_API_URL
```

For example:

```bash
docker compose build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000 \
  --build-arg VITE_GATEWAY_API_URL=https://api-sandbox.example.dev/v1 \
  frontend

docker compose up -d
```

The Nginx configuration also provides:

* SPA fallback to `index.html`, allowing refreshes on `/checkout`,
  `/summary`, and `/result`.
* Long-term caching for Vite content-hashed assets.
* `Cache-Control: no-cache` for the SPA entry point.
* Security headers for the deployed app are added at the edge by CloudFront
  (see [Security](#security)).

The backend container does not automatically run migrations or seed data.
Run those commands from the host after the containers are started:

```bash
cd backend
npm install
cp .env.example .env
npm run migration:run
npm run seed
```

## API documentation

- **Swagger UI:** `http://localhost:3000/docs` locally, or
  [`https://d106nu0rs3ez37.cloudfront.net/docs`](https://d106nu0rs3ez37.cloudfront.net/docs) deployed
- **OpenAPI JSON, importable as a Postman collection:** `http://localhost:3000/docs-json` locally, or
  [`https://d106nu0rs3ez37.cloudfront.net/docs-json`](https://d106nu0rs3ez37.cloudfront.net/docs-json) deployed

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

## Deployment (AWS)

**Live app (sandbox payments only):** https://d106nu0rs3ez37.cloudfront.net

| What | URL |
| ---- | --- |
| App | https://d106nu0rs3ez37.cloudfront.net |
| Swagger UI | https://d106nu0rs3ez37.cloudfront.net/docs |
| OpenAPI JSON | https://d106nu0rs3ez37.cloudfront.net/docs-json |

Everything is provisioned with Terraform (Infrastructure as Code) from the
[`infra/`](./infra) folder, and is sized to stay inside the AWS Free Tier
(new accounts, first 12 months).

### Architecture

```text
                      HTTPS (*.cloudfront.net certificate)
 Browser ─────────────────────────────▶ CloudFront
                                          │
                     /products*  /stock*  /customers*  /transactions*
                     /deliveries*  /checkout*  /docs*  /docs-json*
                                          │  HTTP :3000        everything else (SPA)
                                          │                    │  HTTP :8080
                                          ▼                    ▼
                                  ┌───────────────────────────────────┐
                                  │  EC2 (Docker Compose)             │
                                  │   • backend  (NestJS)  :3000      │
                                  │   • frontend (Nginx)   :8080      │
                                  └──────────────┬────────────────────┘
                                                 │ :5432 (security-group restricted)
                                                 ▼
                                      RDS PostgreSQL 16 (private)
```

| Resource | Terraform file | Free Tier notes |
| -------- | -------------- | --------------- |
| VPC / subnets | `network.tf` | Reuses the default VPC — no NAT Gateway, no load balancer (neither is free) |
| Security groups | `security_groups.tf` | SSH only from your IP; RDS reachable only from the EC2 security group |
| RDS PostgreSQL 16 | `rds.tf` | `db.t3.micro`, 20 GB gp3, single-AZ, not publicly accessible |
| EC2 (backend + frontend containers) | `ec2.tf`, `user_data.sh.tpl` | `t3.micro` (or `t2.micro` on older accounts), 20 GB gp3 |
| CloudFront (HTTPS + routing) | `cloudfront.tf` | Free `*.cloudfront.net` certificate, no domain purchase needed |
| CloudFront response headers policy | `security_headers.tf` | HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy — no extra cost |

### Deploy it yourself

Prerequisites: an AWS account, AWS credentials configured locally
(`aws configure`), [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.6,
and an **existing EC2 key pair** (EC2 → Key Pairs).

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # fill in your values (git-ignored)
terraform init
terraform apply
terraform output app_url                        # the public HTTPS URL
```

Variables you must provide in `terraform.tfvars`:

| Variable | Meaning |
| -------- | ------- |
| `key_name` | Name of your existing EC2 key pair |
| `ssh_allowed_cidr` | Your public IP as `x.x.x.x/32` |
| `git_repo_url` | HTTPS URL of this repository (the EC2 clones it on boot) |
| `db_password` | RDS master password |
| `gateway_base_url`, `gateway_public_key`, `gateway_private_key`, `gateway_events_secret`, `gateway_integrity_secret` | Payment gateway sandbox credentials |

On first boot the instance runs `user_data.sh.tpl`, which: adds a swap file,
installs Docker + the Compose/Buildx plugins, clones the repo, writes
`backend/.env` (pointing at RDS), builds both images, runs the migrations and
seed (retrying until the database accepts connections), and starts the
containers. Allow **10–15 minutes** for the first deploy, plus a few minutes
for CloudFront to propagate.

Tear everything down with `terraform destroy`.

### Design decisions & trade-offs

* **One HTTPS domain for frontend and API.** CloudFront routes the API paths
  to the backend and everything else to Nginx. The frontend is built with an
  empty `VITE_API_BASE_URL`, so API calls are same-origin: no CORS and no need
  to know the CloudFront domain at build time.
* **HTTPS ends at CloudFront.** Traffic from CloudFront to the EC2 instance
  travels over HTTP inside AWS. Viewers always get HTTPS (HTTP is redirected).
* **Security headers are set at the edge**, in a CloudFront response headers
  policy (`infra/security_headers.tf`), which is also where HSTS belongs
  since it only applies over HTTPS. The policy is attached to the SPA only:
  `/docs*` (Swagger UI) is excluded because it relies on inline scripts that a
  strict CSP would block.
* **RDS `rds.force_ssl` is disabled** (`aws_db_parameter_group` in `rds.tf`)
  because the backend connects without SSL. The database is not publicly
  accessible and only the EC2 security group can reach port 5432. For a real
  production system, enable SSL in the TypeORM connection and remove that
  parameter.
* **Migrations run from the Dockerfile's `build` stage.** The runtime image
  only contains production dependencies and `dist/`, while the migration CLI
  and the seed need `ts-node` and `src/`.
* **`DATABASE_URL` is overridden for production** in the generated
  `docker-compose.prod.yml`, because the base `docker-compose.yml` hardcodes
  the local `postgres` service.
* **Secrets** live in the git-ignored `terraform.tfvars` and in the Terraform
  state (also git-ignored). A production setup should use AWS Secrets Manager
  or SSM Parameter Store instead of instance user data.
* **Single instance, no high availability.** Enough for this exercise; the
  instance's public IP changes if it is replaced, which Terraform handles by
  updating the CloudFront origin. Do not stop/start the instance manually,
  or CloudFront keeps pointing at the old address until the next `apply`.

### Operating the deployment

* **Shell access:** EC2 console → *Connect* → *EC2 Instance Connect*
  (needs the Instance Connect rule in the security group), or SSH from
  `ssh_allowed_cidr`.
* **Inspect the database** from the instance (RDS is not public):

  ```bash
  cd ~/app
  DBURL=$(sudo grep '^DATABASE_URL=' backend/.env | cut -d= -f2-)
  sudo docker run --rm -it postgres:16-alpine psql "$DBURL"
  ```

* **Container status and logs:**

  ```bash
  sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps -a
  sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend --tail 50
  ```

* Changing `user_data.sh.tpl` replaces the instance on the next
  `terraform apply` (`user_data_replace_on_change = true`), because cloud-init
  only runs on first boot.

### Local vs. deployed Docker

* `docker-compose.yml` is a **local development convenience only**
  (hardcoded Postgres password, no TLS, and port 5432 published to the host).
  The AWS deployment layers a generated `docker-compose.prod.yml` on top of it.
* **Frontend configuration:** `VITE_API_BASE_URL` and `VITE_GATEWAY_API_URL`
  are injected at build time because Vite embeds `VITE_*` variables into the
  generated frontend bundle.
* **Nginx:** the production frontend serves on port `8080`, provides SPA
  routing fallback and caches hashed assets. In the AWS deployment, security
  headers are added by CloudFront (see above).

## Security

- No raw card data (number/CVC) ever touches our backend or is persisted in
  the frontend's state — tokenization happens directly against the gateway
  from the browser.
- `helmet` security headers, strict request validation, and restricted CORS
  on the API. See [backend/README.md#security](./backend/README.md#security).
- **Browser security headers** (added by CloudFront on the deployed app):
  `Strict-Transport-Security` (1 year), `Content-Security-Policy`
  (`default-src 'self'`, `frame-ancestors 'none'`, and `connect-src` limited to
  the app itself plus the payment gateway origin used for card tokenization),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
  Scan of the deployed URL with the
  [Mozilla HTTP Observatory](https://observatory.mozilla.org/): **A+ (110/100),
  12/12 tests passed**. `style-src` still allows `'unsafe-inline'`, which
  Observatory does not penalize; tightening it is left as future work.
- **Infrastructure:** HTTPS enforced at CloudFront (HTTP redirects to HTTPS);
  the database is private and only reachable from the application's security
  group; SSH is restricted to a single IP; `terraform.tfvars` and Terraform
  state (which contain secrets) are git-ignored. See
  [Design decisions & trade-offs](#design-decisions--trade-offs) for the
  known compromises.