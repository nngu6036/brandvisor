# Docker Compose Deploy/Undeploy Manual

This document explains how to deploy and undeploy this project using `docker compose`.

## 1. Prerequisites

1. Docker Engine + Docker Compose plugin installed.
2. Access to the target machine (SSH).
3. Open ports:
- `3000` (frontend)
- `5000` (backend)
- `27017` (MongoDB, optional external access)
- `6379` (Redis, optional external access)

Check versions:

```bash
docker --version
docker compose version
```

## 2. Project Setup

Clone the repo and enter project folder:

```bash
git clone <your-repo-url> brandvisor
cd brandvisor
```

## 3. Create `.env` (required)

`docker-compose.yml` uses `./.env` (repo root) for both substitution and container env vars.

Create `.env` in repo root:

```env
# Required by backend startup validation
SECRET_KEY=change-me
MONGO_URI=mongodb://admin:adminpassword@mongo:27017/brandvisor?authSource=admin
OPENAI_API_KEY=sk-...
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
PUBLIC_BASE_URL=http://<SERVER_IP_OR_DOMAIN>:5000

# Recommended
CORS_ORIGINS=http://<SERVER_IP_OR_DOMAIN>:3000
LLM_MODEL=gpt-5.2-2025-12-11
LLM_TEMPERATURE=0.2
LLM_TIMEOUT=60

# Optional
CREATIVE_API_TOKEN=
CREATIVE_API_URL=

# Mongo root credentials used by the mongo service
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=adminpassword
```

Notes:
- `OPENAI_API_KEY` is required by backend env validation.
- `MONGO_URI` should use host `mongo` (service name), not `localhost`, when running in compose network.

## 4. Deploy

Build and start all services in background:

```bash
docker compose up -d --build
```

Services started:
- `mongo`
- `redis`
- `backend`
- `celery-worker`
- `celery-beat`
- `frontend`

Check status:

```bash
docker compose ps
```

Follow logs:

```bash
docker compose logs -f
```

Per-service logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery-worker
```

## 5. Verify Deployment

1. Frontend: `http://<SERVER_IP_OR_DOMAIN>:3000`
2. Backend health/API should respond on `http://<SERVER_IP_OR_DOMAIN>:5000`
3. Ensure no backend env validation errors in logs.

## 6. Update / Redeploy

After pulling new code:

```bash
git pull
docker compose up -d --build
```

If only restarting without rebuild:

```bash
docker compose up -d
```

## 7. Undeploy

### Option A: Stop and remove containers/network, keep Mongo data

```bash
docker compose down
```

### Option B: Stop and remove containers/network + volumes (deletes DB data)

```bash
docker compose down -v
```

Use Option B only when you intentionally want a clean reset.

### Option C: Remove images too (full cleanup)

```bash
docker compose down --rmi all -v
```

## 8. Common Operations

Restart one service:

```bash
docker compose restart backend
```

Open shell in backend container:

```bash
docker compose exec backend sh
```

Check running containers:

```bash
docker compose ps
```

## 9. Troubleshooting

1. Backend exits immediately:
- Check `docker compose logs backend`
- Usually missing/invalid required env vars (`OPENAI_API_KEY`, `MONGO_URI`, etc.)

2. Frontend cannot reach backend:
- Verify `NEXT_PUBLIC_API_BASE_URL` and `PUBLIC_BASE_URL`
- Confirm backend is listening on `5000`

3. Redis/Mongo connection issues:
- Verify `REDIS_URL`, `CELERY_*`, `MONGO_URI` use compose service names (`redis`, `mongo`)

4. Port already in use:
- Change host ports in `docker-compose.yml` or stop conflicting processes.

