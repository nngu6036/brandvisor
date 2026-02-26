# BrandVisor (Scaffold v3)

Frontend: **Next.js (React) + Turbopack + pnpm + Tailwind CSS + Headless UI + Remix Icon + Heroicons**
State/Data: **Zustand + SWR + React Query (@tanstack/react-query)**
Backend: **Flask (Python)**
Async tasks: **Celery**
DB: **MongoDB**
Broker/result backend: **Redis**
Local orchestration: **Docker Compose**

## Quickstart (Docker)
1) Copy env:
```bash
cp .env.example .env
```

2) Run:
```bash
docker compose up --build
```

## URLs
- Frontend: http://localhost:3000
- Backend:  http://localhost:5000
- MongoDB (Compass): localhost:27017
- Redis: localhost:6379

## MongoDB Compass connection
Use:
```txt
mongodb://admin:adminpassword@localhost:27017/?authSource=admin
```

## MVP Login Demo
The `/login` page accepts **any credentials** for demo purposes only.

## Local dev (DB/Redis in Docker, FE/BE locally)
Start Mongo + Redis:
```bash
docker compose up -d mongo redis
```

Backend:
```bash
cd backend
cp .env.example .env
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Celery worker:
```bash
cd backend
source .venv/bin/activate
celery -A app.celery_worker.celery worker -l INFO -P solo
```

Frontend:
```bash
cd frontend
cp .env.example .env.local
corepack enable
pnpm install
pnpm dev
```
