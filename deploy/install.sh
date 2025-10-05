#!/usr/bin/env bash
set -euo pipefail

# Interactive installer for Marzban Admin Panel
# Requirements: bash, docker, docker compose, openssl

red() { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    red "[!] دستور '$1' پیدا نشد. لطفا نصب کنید و دوباره اجرا کنید."; exit 1
  fi
}

here_dir() { cd "$(dirname "$0")" && pwd; }
repo_root() { cd "$(dirname "$0")/.." && pwd; }

main() {
  require_cmd docker
  if ! docker compose version >/dev/null 2>&1; then
    red "[!] Docker Compose (v2) در دسترس نیست. Docker را به‌روز کنید."; exit 1
  fi

  local ROOT; ROOT=$(repo_root)
  cd "$ROOT"

  yellow "— تنظیمات اولیه —"
  read -rp "دامنه پنل (مثال: panel.example.com): " DOMAIN
  DOMAIN=${DOMAIN:-panel.local}
  read -rp "پورت HTTP روی میزبان [8080]: " HTTP_PORT
  HTTP_PORT=${HTTP_PORT:-8080}
  read -rp "پورت HTTPS روی میزبان [8443]: " HTTPS_PORT
  HTTPS_PORT=${HTTPS_PORT:-8443}

  read -rp "ایمیل ادمین اولیه [admin@example.com]: " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
  read -rp "پسورد ادمین اولیه [تولید خودکار اگر خالی]: " ADMIN_PASSWORD || true
  if [ -z "${ADMIN_PASSWORD:-}" ]; then ADMIN_PASSWORD=$(openssl rand -base64 18); fi

  read -rp "SECRET_KEY (خالی=تولید خودکار): " SECRET_KEY || true
  if [ -z "${SECRET_KEY:-}" ]; then SECRET_KEY=$(openssl rand -hex 32); fi

  local PORT_SUFFIX=""
  if [ "${HTTPS_PORT}" != "443" ]; then PORT_SUFFIX=":${HTTPS_PORT}"; fi
  local API_BASE="https://${DOMAIN}${PORT_SUFFIX}/api"
  local CORS_ORIGINS="https://${DOMAIN}${PORT_SUFFIX}"

  yellow "— SSL —"
  echo "1) استفاده از گواهی موجود (مسیر فایل‌ها را می‌پرسد)"
  echo "2) ساخت گواهی self-signed برای تست"
  read -rp "گزینه SSL [1/2] (پیش‌فرض 2): " SSL_MODE
  SSL_MODE=${SSL_MODE:-2}

  mkdir -p deploy/nginx/conf.d deploy/certs

  local FULLCHAIN="deploy/certs/fullchain.pem"
  local PRIVKEY="deploy/certs/privkey.pem"

  if [ "$SSL_MODE" = "1" ]; then
    read -rp "مسیر fullchain.pem: " SRC_FULL
    read -rp "مسیر privkey.pem: " SRC_KEY
    cp "$SRC_FULL" "$FULLCHAIN"
    cp "$SRC_KEY" "$PRIVKEY"
  else
    yellow "در حال ساخت گواهی self-signed برای ${DOMAIN} (یک‌سال اعتبار)"
    openssl req -x509 -nodes -newkey rsa:2048 \
      -keyout "$PRIVKEY" -out "$FULLCHAIN" \
      -days 365 -subj "/CN=${DOMAIN}" >/dev/null 2>&1 || true
  fi

  yellow "— تولید پیکربندی NGINX —"
  cat > deploy/nginx/conf.d/marzban.conf <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://${DOMAIN}${PORT_SUFFIX}\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # WebSocket proxy
    location /ws/ {
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_pass http://backend:8000/ws/;
    }

    location /api/ {
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://backend:8000/api/;
    }

    location / {
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://frontend:3000/;
    }
}
NGINX

  yellow "— تولید docker-compose.generated.yml —"
  cat > docker-compose.generated.yml <<COMPOSE
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin
      POSTGRES_DB: marzban
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d marzban"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    command: ["redis-server", "--save", "900 1", "300 10", "60 10000", "--appendonly", "yes"]
    volumes:
      - redisdata:/data

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      DATABASE_URL: postgresql+psycopg://admin:admin@postgres:5432/marzban
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      CORS_ORIGINS: ${CORS_ORIGINS}
      API_PREFIX: /api
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      - postgres
      - redis
    volumes:
      - backend-data:/data

  frontend:
    build:
      context: ./frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_BASE_URL: ${API_BASE}
    ports:
      - "3000:3000"

  db-backup:
    image: postgres:16
    environment:
      PGHOST: postgres
      PGUSER: admin
      PGPASSWORD: admin
      PGDATABASE: marzban
      TZ: UTC
    depends_on:
      - postgres
    volumes:
      - dbbackups:/backups
    entrypoint: ["bash", "-lc", "while true; do TS=\$(date -u +%Y%m%d_%H%M%S); pg_dump -Fc -f /backups/marzban_\"\$TS\".dump && echo Backup done at \"\$TS\"; sleep 86400; done"]

  nginx:
    image: nginx:1.27-alpine
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deploy/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./deploy/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    ports:
      - "${HTTP_PORT}:80"
      - "${HTTPS_PORT}:443"

volumes:
  pgdata:
  redisdata:
  backend-data:
  dbbackups:
COMPOSE

  yellow "— راه‌اندازی سرویس‌ها —"
  COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f docker-compose.generated.yml build --parallel
  docker compose -f docker-compose.generated.yml up -d
  # Ensure backend migrations complete for first-run CLI ops
  docker compose -f docker-compose.generated.yml exec -T backend python -m alembic -c app/../alembic.ini upgrade head || true

  green "نصب کامل شد!"
  echo "پنل: https://${DOMAIN}${PORT_SUFFIX}"
  echo "API:  https://${DOMAIN}${PORT_SUFFIX}/api"
  echo "ادمین: ${ADMIN_EMAIL} | ${ADMIN_PASSWORD}"
  echo "برای اعمال تغییرات کد بدون حذف دیتابیس: ./scripts/reinstall_preserve_db.sh"
}

main "$@"