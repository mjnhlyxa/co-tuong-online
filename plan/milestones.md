# co-tuong-online — Implementation Milestones

> Timeline based on 3-week development cycle

## Phase 1: Foundation
**Duration**: Week 1 (Days 1–5)
**Goal**: Core game board, pieces, and movement rules working

### Day 1–2: Project Setup
- [ ] Initialize Bun monorepo with `package.json` workspaces
- [ ] Set up `apps/web/` with Next.js 14 + TypeScript
- [ ] Set up `apps/api/` with FastAPI + Motor
- [ ] Connect to MongoDB (`10.60.184.61:27017`)
- [ ] Verify both apps start successfully

### Day 3–4: Game Engine
- [ ] Implement Cờ Tướng piece types + starting positions
- [ ] Implement all 7 piece movement validators (pure functions)
- [ ] Implement check/checkmate detection
- [ ] Implement move notation generation
- [ ] Unit tests for all rules

### Day 5: Basic Frontend Board
- [ ] Render 10×9 board with correct initial piece placement
- [ ] Piece SVGs for all 7 types (red + black)
- [ ] Click-to-select, click-to-move interaction
- [ ] Highlight selected piece, show valid move dots
- [ ] Responsive sizing (320px–600px)

### Day 5: Basic Backend (Room)
- [ ] Room model + REST endpoints (create, list, get)
- [ ] Room code generation (6-char alphanumeric)
- [ ] MongoDB indexes

## Phase 2: Multiplayer Core
**Duration**: Week 2 (Days 6–10)
**Goal**: Full multiplayer with room join, WebSocket sync

### Day 6–7: Room System + Game Start
- [ ] Join room flow — player 2 joins → game auto-creates
- [ ] Initial board sync to both clients
- [ ] Turn indicator (which player's turn)
- [ ] Player panels with names

### Day 8–9: WebSocket Real-time
- [ ] FastAPI WebSocket endpoint
- [ ] Connection manager (broadcast to all room players)
- [ ] WebSocket → React client hook
- [ ] Move submission via WS + fallback REST
- [ ] Reconnection logic with state recovery

### Day 10: Win Conditions + Game End
- [ ] Checkmate detection + winner declaration
- [ ] GameEndModal with result, rematch, exit
- [ ] Save completed game to MongoDB
- [ ] Timer (5-minute time bank per player)

## Phase 3: Polish + Launch Readiness
**Duration**: Week 3 (Days 11–15)
**Goal**: Mobile polish, match history, social features

### Day 11–12: Mobile + Touch
- [ ] Tap-to-select + tap-to-move (mobile primary)
- [ ] Mobile player panel layout
- [ ] Touch DnD (secondary on mobile)
- [ ] Test at 375px + 768px viewport

### Day 13: Rules Modal + Onboarding
- [ ] RulesModal with piece movement diagrams
- [ ] Auto-focused room code input
- [ ] "?" help button in game UI  
- [ ] Keyboard shortcut (Escape → rules modal)

### Day 14: Match History
- [ ] View past games via `/match/[gameId]`
- [ ] Move-by-move replay (click move in history)
- [ ] Player history page (from localStorage)

### Day 15: Final Testing + Bug Fixes
- [ ] Full Playwright test suite for core flows
- [ ] E2E test: create room → join → play → end
- [ ] Mobile testing on real device
- [ ] Fix known bugs, finalize styling

## Phase 4: Deploy
**Duration**: Day 16
**Goal**: Live on Vercel + Railway

- [ ] Connect GitHub repo (mjnhlyxa)
- [ ] Set up Vercel project for frontend
- [ ] Set up Railway project for backend (or Render if Railway unavailable)
- [ ] Set env vars (MongoDB URL, API URLs)
- [ ] Initial deploy smoke test
- [ ] Update lobby link reference

## Post-Launch (Future)
- [ ] Spectator mode
- [ ] Public room lobby with pagination
- [ ] Player profiles with stats
- [ ] Sound effects (move sounds, check, win/loss)
- [ ] ELO rating system
