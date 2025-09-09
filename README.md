# Marzban Admin Panel

Stack: FastAPI + PostgreSQL + Redis + Alembic + Next.js + Tailwind + NGINX + Docker Compose.

## Quick Start

1. Create cert files (self-signed for test) in `deploy/certs/` as `fullchain.pem` and `privkey.pem` or adjust NGINX to use HTTP only.
2. Create a `.env` (optional) or use Docker envs.
3. Build and run:

```bash
docker compose build
docker compose up -d
```

Backend on `http://localhost:8000`, Frontend on `http://localhost:3000`, NGINX on `https://localhost`.

Default admin (set via compose env): `ADMIN_EMAIL=admin@example.com`, `ADMIN_PASSWORD=admin123`.

## Environment Variables (backend)
- DATABASE_URL: postgresql+psycopg://admin:admin@postgres:5432/marzban
- REDIS_URL: redis://redis:6379/0
- SECRET_KEY: change-me
- CORS_ORIGINS: http://localhost:3000
- API_PREFIX: /api
- ADMIN_EMAIL, ADMIN_PASSWORD: seed admin user on startup
- FILE_STORAGE_LOCAL_PATH: /data/configs

## Features
- JWT auth with refresh, RBAC roles
- Users CRUD (admin/operator list, admin create/update/enable/disable)
- Configs upload/download (signed URLs), update/delete
- Audit logs with filters
- WebSocket notifications via Redis
- Command control via Redis Pub/Sub
- Monitoring endpoint (CPU/MEM/DB/Redis)

## Backup
- Daily PostgreSQL dump saved in `dbbackups` volume (service `db-backup`).
- Redis configured with AOF and snapshotting.

## Development
- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev` in `frontend/`

## Security
- Enable SSL in NGINX; rate limit auth endpoints; bcrypt hashing; signed download links.