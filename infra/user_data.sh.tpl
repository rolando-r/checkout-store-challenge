#!/bin/bash
set -euo pipefail

# ---- 0. Swap: t2/t3.micro have 1 GB RAM, not enough for npm ci + tsc/vite ----
# builds. Without swap the kernel OOM-kills the build and the script dies.
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# ---- 1. Docker + compose plugin (Amazon Linux 2023) ----
dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins

# Versions are pinned on purpose: AL2023's docker package ships an old buildx,
# and recent compose releases refuse to build without buildx >= 0.17.
curl -SL https://github.com/docker/compose/releases/download/v2.32.1/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
curl -SL https://github.com/docker/buildx/releases/download/v0.19.3/buildx-v0.19.3.linux-amd64 \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
         /usr/local/lib/docker/cli-plugins/docker-buildx

# ---- 2. Pull the app ----
cd /home/ec2-user
git clone ${git_repo_url} app
cd app

# ---- 3. Backend env (points at RDS, not the local postgres service) ----
cat > backend/.env <<EOF
DATABASE_URL=postgresql://${db_username}:${db_password}@${db_endpoint}/${db_name}
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
GATEWAY_BASE_URL=${gateway_base_url}
GATEWAY_PUBLIC_KEY=${gateway_public_key}
GATEWAY_PRIVATE_KEY=${gateway_private_key}
GATEWAY_EVENTS_SECRET=${gateway_events_secret}
GATEWAY_INTEGRITY_SECRET=${gateway_integrity_secret}
BASE_FEE_IN_CENTS=${base_fee_in_cents}
DELIVERY_FEE_IN_CENTS=${delivery_fee_in_cents}
EOF

# ---- 4. Prod override: drop the local postgres service, build the ----
# frontend with a RELATIVE API base URL. Because CloudFront serves both
# the frontend and (via extra path behaviors) the backend under the SAME
# domain, "" resolves to same-origin calls — so we never need to know the
# CloudFront domain name at build time (no chicken-and-egg with Terraform).
cat > docker-compose.prod.yml <<'EOF'
services:
  # One-off job: the runtime image only has prod deps + dist/, but the
  # migration CLI and the seed need ts-node and src/, which only exist in
  # the Dockerfile's "build" stage. Same code, same .env, different target.
  migrate:
    build:
      context: ./backend
      target: build
    env_file: ./backend/.env
    command: ["sh", "-c", "npm run migration:run && npm run seed"]
  backend:
    depends_on: []
    restart: unless-stopped
    # The base docker-compose.yml hardcodes DATABASE_URL=...@postgres:5432 in
    # `environment:`, which beats env_file. Override it here with the RDS URL.
    environment:
      DATABASE_URL: "postgresql://${db_username}:${db_password}@${db_endpoint}/${db_name}"
    ports:
      - "3000:3000"
  frontend:
    restart: unless-stopped
    build:
      args:
        VITE_API_BASE_URL: ""
        VITE_GATEWAY_API_URL: "${gateway_base_url}"
    ports:
      - "8080:8080"
EOF

# ---- 5. Build images (no local postgres — RDS is the DB) ----
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE build backend
$COMPOSE build frontend

# ---- 6. Migrate + seed BEFORE the app starts serving traffic ----
# The DB may still be applying its parameter group / rebooting, so retry
# for up to ~10 minutes instead of failing on the first refused connection.
migrated=0
for attempt in $(seq 1 20); do
  if $COMPOSE run --rm --no-deps migrate; then
    migrated=1
    break
  fi
  echo "migrate attempt $attempt failed, retrying in 30s..."
  sleep 30
done
if [ "$migrated" -ne 1 ]; then
  echo "migrations never succeeded, aborting"
  exit 1
fi

# ---- 7. Start both containers for real ----
$COMPOSE up -d --no-deps backend frontend
