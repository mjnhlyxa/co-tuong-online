# co-tuong-online — Deployment Plan

> **C4 Level**: 2+3 — Deployment & Infrastructure

## 1. Repository Setup

### 1.1 GitHub Repository
- Owner: `mjnhlyxa`
- Repo: auto-detected from `games/co-tuong-online/` directory
- Branch: `main`

### 1.2 GitHub Secrets Required
```
VERCEL_TOKEN=<vercel-token>
VERCEL_ORG_ID=<vercel-org-id>
VERCEL_PROJECT_ID=<vercel-project-id>
```

## 2. Monorepo Deployment Targets

```
GitHub Repo (mjnhlyxa/co-tuong-online)
    │
    ├── Push to apps/web/  ──►  Vercel ──►  Frontend URL
    │                                          (co-tuong-online.vercel.app)
    │
    └── Push to apps/api/  ──►  Railway/Render ──►  Backend URL
                                                  (api.co-tuong-online.railway.app)
```

## 3. Frontend Deployment (Vercel)

### 3.1 Vercel Project Setup
- Framework: Next.js (detected automatically)
- Root directory: `apps/web`
- Environment variables:
  - `NEXT_PUBLIC_WS_URL` = `wss://api.co-tuong-online.railway.app/ws`
  - `NEXT_PUBLIC_API_URL` = `https://api.co-tuong-online.railway.app`

### 3.2 Vercel Configuration
```json
// apps/web/vercel.json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "nextjs",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.co-tuong-online.railway.app/:path*" }
  ]
}
```

## 4. Backend Deployment (Railway)

### 4.1 Railway Setup
1. Connect GitHub repo to Railway
2. Select `apps/api/` as root directory
3. Set start command: `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
4. Environment variables:
   - `MONGODB_URL` = `mongodb://10.60.184.61:27017`
   - `MONGODB_DB` = `co_tuong_online`

### 4.2 Railway Configuration
```toml
# apps/api/railway.toml
[build]
builder = "python"
pythonVersion = "3.11"

[deploy]
startCommand = "uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT"
healthCheckPath = "/health"
```

### 4.3 Health Check Endpoint
```python
@app.get("/health")
async def health():
    return {"status": "ok", "mongodb": "connected"}
```

## 5. MongoDB Connection

```
MongoDB Host: 10.60.184.61
Port: 27017
Database: co_tuong_online
Connection: mongodb://10.60.184.61:27017
```

Backend connection uses Motor (async MongoDB driver):
```python
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = client[os.getenv("MONGODB_DB", "co_tuong_online")]
```

## 6. Domains & SSL

| Service | Domain | SSL |
|---------|--------|-----|
| Frontend | `co-tuong-online.vercel.app` (auto) | Vercel auto |
| Backend API | `api.co-tuong-online.railway.app` (Railway auto) | Railway auto |
| Custom domain | Optional: `co-tuong.mydomain.com` | Cloudflare |

## 7. CI/CD Pipeline

### 7.1 GitHub Actions Workflow (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r apps/api/requirements.txt
      - # Connect Railway via Railway CLI or GitHub integration
```

## 8. Database Index Setup

After MongoDB is available, run these indexes:
```javascript
// Connect: mongosh "mongodb://10.60.184.61:27017/co_tuong_online"

use co_tuong_online;

// Rooms collection
db.rooms.createIndex({ "code": 1 }, { unique: true });
db.rooms.createIndex({ "status": 1, "is_private": 1 });
db.rooms.createIndex({ "created_at": -1 });

// Games collection
db.games.createIndex({ "room_id": 1 });
db.games.createIndex({ "players.id": 1 });
db.games.createIndex({ "status": 1, "created_at": -1 });
```

## 9. Deployment Verification

Post-deploy smoke test:
```
# Frontend health
curl https://co-tuong-online.vercel.app/
# Expected: 200 OK with Next.js page

# Backend health
curl https://api.co-tuong-online.railway.app/health
# Expected: {"status": "ok", "mongodb": "connected"}

# API smoke test
curl -X POST https://api.co-tuong-online.railway.app/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room", "playerName": "Tester"}'
# Expected: 201 Created with room object
```

## 10. Post-Deployment Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Backend health check returns "ok"
- [ ] Room creation flow works end-to-end
- [ ] WebSocket connects successfully
- [ ] Move submission is validated
- [ ] Mobile responsive at 375px viewport
- [ ] GitHub push triggers auto-deploy
