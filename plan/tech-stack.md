# Tech Stack — Cờ Tướng Online

## Core

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20+ | Via Next.js |
| Framework | Next.js (App Router) | 14.x | FE + BE unified |
| Language | TypeScript | 5.x | Strict mode |
| Database | MongoDB + Mongoose | 8.x | Flexible schema cho game state |
| Styling | Tailwind CSS | 3.x | Utility-first, đi kèm create-next-app |
| State management | React hooks + SWR | — | SWR cho polling game state |

## Infrastructure (Free Tier)

| Service | Purpose | Free Limit | Notes |
|---------|---------|-----------|-------|
| Vercel | Hosting Next.js | 100GB bandwidth/tháng, unlimited requests | Zero-config cho Next.js |
| MongoDB Atlas | Database | M0: 512MB, shared cluster | Đủ cho hàng nghìn ván cờ |
| Cloudflare | CDN + DNS + DDoS | Free plan | Đặt trước Vercel |
| GitHub | Source code + CI/CD | Free | Auto-deploy khi push main |

## Key Libraries

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "mongoose": "^8.0.0",
    "swr": "^2.2.0",
    "uuid": "^9.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/uuid": "^9",
    "typescript": "^5",
    "eslint": "^8",
    "eslint-config-next": "^14"
  }
}
```

## Real-time Strategy

**Approach**: HTTP Polling với SWR — poll API `/api/games/[id]` mỗi 1.5 giây khi đang trong ván.

**Lý do chọn polling thay vì WebSocket/SSE**:
- Vercel serverless functions không support WebSocket persistent connections
- SSE có thể dùng nhưng thêm complexity
- Với cờ tướng (turn-based, không phải real-time action game), 1.5s delay là hoàn toàn chấp nhận được
- SWR built-in: `useSWR(url, fetcher, { refreshInterval: 1500 })`

**Upgrade path**: Nếu cần nhanh hơn sau này → chuyển sang Pusher free tier (200k messages/ngày free)

## Why This Stack

- **Next.js**: FE + API routes trong một codebase, deploy lên Vercel zero-config, SEO-friendly cho lobby
- **MongoDB**: Schema linh hoạt cho game state (moves array, board positions), không cần migration
- **Vercel + MongoDB Atlas**: Cả hai đều có free tier mạnh, không cần credit card để bắt đầu
- **No Auth library**: Không cần NextAuth — anonymous play với UUID đơn giản hơn và không có friction

## Free Tier Limits & Scaling

| Concern | Free Limit | Expected Usage | Status |
|---------|-----------|---------------|--------|
| MongoDB storage | 512MB | ~1KB/ván × 100K ván = 100MB | OK |
| Vercel bandwidth | 100GB/tháng | ~50KB/page × 1M views = 50GB | OK |
| Vercel function invocations | Unlimited | — | OK |
| Polling requests | — | 1 req/1.5s × max 100 concurrent games = 67 req/s | OK (Vercel handles this) |

## Local Dev Setup

```bash
# Prerequisites: Node 20+, MongoDB running locally (brew install mongodb-community)
cd co-tuong-online/app
npm install
cp .env.example .env.local
# Edit .env.local: MONGODB_URI=mongodb://localhost:27017/co-tuong-online
npm run dev
# → http://localhost:3000
```
