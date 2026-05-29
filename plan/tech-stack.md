# co-tuong-online — Technology Stack

> **C4 Level**: 2 — Technology Choices

## 1. Monorepo Architecture

### Why Bun + Workspace
- **Bun** as package manager and workspace orchestrator
- Faster installs than npm/yarn (<100ms vs 1-2s)
- Bundle-compatible with Next.js (uses esbuild)
- Workspace support: single `bun.lockb` for all packages

### Workspace Structure
```json
// package.json (root)
{
  "name": "co-tuong-online",
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "bun --cwd apps/web dev",
    "dev:api": "bun --cwd apps/api uvicorn main:app --reload"
  }
}
```

## 2. Frontend Stack

| Category | Technology | Version | Rationale |
|---------|-----------|--------|-----------|
| Framework(SPA) | Next.js | 14+ | App Router, TypeScript, SSG lobby |
| Language | TypeScript | 5.x | Strict mode, full type safety |
| Styling | Tailwind CSS | 3.x | Utility-first, responsive, no runtime |
| State Fetching | React Query | 5.x | Hooks-based, caching, refetchInterval |
| UUID | uuid (browser crypto) | — | `crypto.randomUUID()` native, no lib needed |
| Game Engine | Pure TypeScript | — | No framework deps, easy port |
| Testing | Playwright | 1.x | E2E, cross-browser |

### Next.js Specifics
- `app/` router with server + client components
- `use client` directive for game board (needs interactivity)
- `export const dynamic = 'force-dynamic'` for game pages (no SSG)
- API routes only for SSR fallback data

## 3. Backend Stack

| Category | Technology | Version | Rationale |
|---------|-----------|--------|-----------|
| Framework | FastAPI | 0.110+ | Python async, auto-OpenAPI docs |
| Language | Python | 3.11+ | Type hints core to design |
| DB Driver | Motor | 3.x | Async MongoDB driver for FastAPI |
| Validation | Pydantic | 2.x | Runtime type validation |
| WS Server | FastAPI WebSocket | — | Native, async |
| Server | Uvicorn | 0.27+ | ASGI server for FastAPI |
| WebSocket | Native fastapi.websockets | — | No additional library needed |
| CORS | FastAPI Starlette | — | Built-in CORSMiddleware |

### FastAPI Dependencies
```
# apps/api/requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
motor==3.3.2
pydantic==2.6.1
python-multipart==0.0.9
websockets==12.0
```

## 4. Database

| Category | Technology | Notes |
|---------|-----------|-------|
| Database | MongoDB | 6.x |
| Driver | Motor | Async Python MongoDB driver |
| Host | 10.60.184.60 | Port 27017 |
| DB Name | co_tuong_online | |

No MongoDB ORM/Mongoose — raw Motor driver with Pydantic models for validation.

## 5. DevOps / Deployment

| Category | Technology | Notes |
|---------|-----------|-------|
| Frontend Host | Vercel | Auto-deploy from GitHub |
| Backend Host | Railway | Or Render (fallback) |
| CDN | Vercel Edge | Static caching |
| Source Control | GitHub | mjnhlyxa repo |
| CI/CD | GitHub Actions | Deploy on push to main |
| Domain | Vercel分配的 + Railway | Optional custom domain |

## 6. Key Dependencies Tree

```
co-tuong-online (monorepo)
├── apps/
│   ├── web/
│   │   ├── next@14+
│   │   ├── react@18+
│   │   ├── @tanstack/react-query@5
│   │   ├── tailwindcss@3
│   │   └── typescript@5
│   └── api/
│       ├── fastapi@0.110
│       ├── uvicorn[standard]
│       ├── motor@3.3
│       ├── pydantic@2
│       └── python@3.11
```

## 7. Alternative Technologies Considered

| Alternative | Rejected Reason |
|-------------|----------------|
| Socket.io | FastAPI native WebSocket sufficient; Socket.io adds overhead |
| MongoDB Atlas (cloud) | Free tier M0 has limits; self-hosted at 10.60.184.61 is cheaper |
| Prisma | ORM adds latency; Motor's async driver sufficient for simple schema |
| tRPC | Not needed for this scale; REST + WS is simpler |
| NextAuth | No auth in MVP; anonymous play supported |
