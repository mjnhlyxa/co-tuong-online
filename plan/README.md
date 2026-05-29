# co-tuong-online — Technical Plan

> **Status**: Draft | Created: 2026-05-29 | Last Updated: 2026-05-29
> **C4 Level**: 1 — Context Overview

## 1. Game Overview

### 1.1 Game Concept
An online Vietnamese Chess (Cờ Tướng) platform enabling two players to compete in real-time matches using room codes, with full move history tracking, turn timer support, and spectator observation mode. Built as a Bun monorepo with Next.js frontend and FastAPI backend, persists state to MongoDB.

### 1.2 Game Type
- **Genre**: Board game / Strategy
- **Platform**: Web browser (desktop primary, mobile responsive)
- **Session Length**: Medium 20–60 min per game
- **Multiplayer Model**: Real-time 1v1 with room codes + spectator support
- **Account Required**: No — anonymous play supported via localStorage UUID

### 1.3 Target Audience
- Vietnamese chess enthusiasts who want to play online with friends
- Players who prefer rooms-with-spectators model for learning and social play
- Casual players looking for quick strategic matches without account creation

## 2. System Context (C4 L1)

### 2.1 User Interactions
```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Desktop     │  │ Mobile      │  │ Spectators          │  │
│  │ Browser     │  │ Browser     │  │ (future)            │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼───────────────┼────────────────────┼─────────────┘
          │               │                    │
          ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              co-tuong-online Platform                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Frontend: Next.js 14 (Browser)                        │  │
│  │ - Lobby page (room list, create/join)                  │  │
│  │ - Game page (board, player panels, move history)       │  │
│  │ - Game rules modal                                    │  │
│  │ - Pure JS game engine (no React deps)                │  │
│  └──────────────────────────┬──────────────────────────┘  │
│                             │                               │
│  ┌─────────────────────────▼──────────────────────────┐   │
│  │ Backend: FastAPI (Python)                          │   │
│  │ - REST API for rooms CRUD                          │   │
│  │ - WebSocket for real-time game sync                │   │
│  │ - Game state validation & rule enforcement          │   │
│  │ - Room management & player tracking                │   │
│  └──────────────────────────┬──────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼──────────────────────────┐  │
│  │ Database: MongoDB (10.60.184.61:27017)              │  │
│  │ - games collection (game state, moves)                │  │
│  │ - rooms collection (lobby, waitlist)                  │  │
│  │ - players collection (identity, history)              │  │
│  └──────────────────────────┬──────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼──────────────────────────┐  │
│  │ Hosting: Vercel (Frontend) + Railway/Render (API)   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 External System Integrations
| External System | Purpose | Integration Method |
|-----------------|---------|-------------------|
| MongoDB Atlas | Persistent game data | MongoDB Python Driver |
| Vercel | Frontend hosting | GitHub auto-deploy |
| Railway/Render | FastAPI hosting | GitHub auto-deploy |
| GitHub | Source code & CI/CD | Git push trigger |

### 2.3 Data Flow Overview
1. User opens URL → Vercel serves Next.js app
2. App loads in browser → generates anonymous playerId (UUID in localStorage)
3. User creates/joins room → REST call to FastAPI → MongoDB persists room
4. Game starts → WebSocket connection established for real-time sync
5. Move made → client sends via WebSocket → FastAPI validates → broadcasts update
6. Game ends → result saved to MongoDB → shown to both players
7. Spectators join via room code → read-only WebSocket stream

### 2.4 Key Non-Functional Requirements
- **Performance**: First contentful paint < 2s, time to interactive < 3s
- **Scalability**: Support 50 concurrent games (100 players)
- **Availability**: 99.5% uptime (Vercel SLA)
- **Data Persistence**: All game data persists across sessions
- **Mobile Support**: Full gameplay at 375px viewport
- **Real-time Latency**: Move broadcasts < 500ms round-trip

## 3. Technology Stack Summary

| Layer | Technology | Version | Notes |
|-------|-----------|--------|-------|
| Frontend Framework | Next.js | 14+ | App Router, TypeScript |
| Language (Frontend) | TypeScript | 5.x | Strict mode |
| Styling | Tailwind CSS | 3.x | Mobile-first responsive |
| Backend Framework | FastAPI | 0.110+ | Python async |
| Language (Backend) | Python | 3.11+ | Type hints |
| Database | MongoDB | Latest | PyMongo motor (async) |
| DB Host | MongoDB Atlas | 10.60.184.61 | Port 27017 |
| Real-time | WebSocket | — | FastAPI WebSocket |
| Hosting (Frontend) | Vercel | — | Auto-deploy on git push |
| Hosting (Backend) | Railway/Render | — | Auto-deploy |
| Monorepo Tool | Bun | 1.x | Workspace management |
| Package Manager | Bun | 1.x | Faster installs |

## 4. Security Considerations
- Anonymous player IDs (UUID v4) — no PII stored
- No authentication required for core gameplay
- Input validation with Pydantic on all API endpoints
- Board coordinates validated server-side per piece movement rules
- WebSocket authenticated via room code + player token
- Rate limiting on REST endpoints (30 req/min)
- CORS restricted to known origins

## 5. Cost Projection (Free Tier)

| Service | Free Tier Limit | Projected Usage | Buffer |
|---------|-----------------|-----------------|--------|
| Vercel | 100GB bandwidth/mo | ~5GB | OK |
| MongoDB Atlas M0 | 512MB storage | ~50MB | OK |
| Railway | 500hrs/mo | ~200hrs | OK |

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WebSocket disconnect mid-game | Medium | Medium | Periodic state persist; client reconnect with state recovery |
| MongoDB connection limits | Low | High | Connection pooling; write batching |
| Concurrent game limit | Low | Medium | Implement per-room player limits (2) |
| Move spam/timing abuse | Low | Medium | Server-side move throttle (1 move/sec max) |
| Complex Cờ Tướng rules bugs | High | High | Exhaustive test suite; reference engine for validation |
