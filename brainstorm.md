# co-tuong-online — Brainstorm

> Status: Draft | Created: 2026-05-29

## Overview
An online Vietnamese Chess (Cờ Tướng) platform enabling two players to compete in real-time matches with room codes, move history tracking, and spectator support. Targets players of all levels with zero-friction onboarding — no signup required to play, with optional auth for match history preservation.

## Game Concept
- **Genre**: Board game / Strategy
- **Platform**: Web browser — desktop primary, mobile responsive
- **Session length**: Medium 20–60 min per game
- **Multiplayer**: Real-time 1v1 with room codes + spectator support
- **Account required**: No — anonymous play by default (localStorage identity)

## Target Audience
- Vietnamese chess enthusiasts who want to play online with friends
- Casual players looking for a quick strategic challenge
- Players who prefer rooms-with-spectators model for learning and social play

## Core Gameplay Loop
1. Player creates a room → shares room code with opponent
2. Opponent joins via room code → both players placed at opposite sides
3. Players alternate turns moving pieces per Cờ Tướng rules
4. Game ends when a General (General/General) is checkmated or captured
5. Win/loss recorded; option to rematch or find new opponent

## Features

### Must-Have (MVP)
- 10×9 grid board with correct Cờ Tướng initial piece placement
- All 7 piece types with correct movement rules (General, Advisor, Elephant, Chariot, Horse, Cannon, Soldier)
- Turn-based play with move validation per piece rules
- Room creation with 4-character alphanumeric code
- Room join via code input
- Real-time move sync via WebSocket (polling fallback)
- Check/checkmate detection and win condition
- Move history notation (standard Cờ Tướng notation)
- Local time bank / move timer per player
- Mobile-responsive board (touch drag-and-drop or tap-to-select-tap-to-move)
- Game end screen with winner declaration, rematch option

### Nice-to-Have (Post-MVP)
- Spectator mode (view-only by room code)
- Public lobby with available rooms listing
- Match history with replay (log-based)
- Player identity persistence (localStorage guest ID)
- Basic ELO/rating system
- Sound effects for moves and game events

### Out of Scope
- AI opponent — reasoning: MVP focuses on human-vs-human only
- Account/auth system — reasoning: anonymous play lowers barrier; optional future feature
- Tournament mode — reasoning: post-MVP consider
- Chat during game — reasoning: may clutter; consider post-MVP

## User Experience Goals
- **Time to first game**: Target < 30 seconds from landing to first move. No signup, no tutorial required to start. Landing → Create Room → Share Code → Ready.
- **Onboarding**: Rules accessible via "?" overlay modal showing each piece's movement diagram
- **Mobile**: Board fills viewport width, pieces large enough to tap; no horizontal scroll
- **Accessibility**: Pieces identifiable by both color and shape; sufficient contrast ratios on board squares

## Social & Virality Features
- Share link for a room: `https://domain.com/room/[code]` — opens directly into game
- Room code display prominently for in-person sharing
- Public lobby to browse open rooms (with owner name, average move count)

## Data to Persist
- **Game state** (mid-game persistence): board position, current turn, move history, time banks, room status
- **Move history**: ordered list of moves in algebraic notation for replay
- **Match history** (past games): winner, date, duration, moves count, players
- **Player identity**: anonymous UUID stored in localStorage, mapped to display name
- **Room/lobby state**: active rooms with waiting/playing status, owner, player count, created time

## Technical Feasibility Assessment

### Straightforward
- Board rendering: static HTML/CSS grid with piece divs; coordinate-based highlighting
- Move validation: rule-based per piece type with boundary checks
- Room management: MongoDB document per room with status (waiting/playing/finished)
- Turn management: server-authoritative — all moves validated server-side
- Static serving with Next.js SSR for initial page load

### Complex or Risky
- Real-time move sync: WebSocket via FastAPI (channels/broadcast) or SSE with polling fallback; requires careful state reconciliation
- Check/checkmate detection: complex for Cờ Tướng — requires accurate line-of-attack calculation across all pieces
- Timer sync: server-timestamped moves to prevent desync exploits
- Mobile drag-and-drop: touch event handling with piece snapping, coordinate translation

### Open Questions
- WebSocket library: `websockets` (Python) or SSE + polling hybrid?
- Game state validation: how to handle disconnect/reconnect mid-game? (resume from last persisted state)
- Rate limiting: move submission throttle to prevent spam/timing abuse
- MongoDB hostname for connection string: use provided `10.60.184.61:27017`
