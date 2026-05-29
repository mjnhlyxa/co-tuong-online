# co-tuong-online — Container Architecture

> **C4 Level**: 2 — Container/Application Architecture

## 1. Application Structure

### 1.1 High-Level Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js Application (SPA)                      │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐   │ │
│  │  │  Lobby       │  │ Game Page     │  │ History Page   │   │ │
│  │  │  Page (/, /lobby) │ (room/[id])  │  (/match)      │   │ │
│  │  └──────────────┘  └───────────────┘  └────────────────┘   │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │           Co Tuong Engine (Pure JS/TS)              │    │ │
│  │  │  - rules.ts: move validation per piece type         │    │ │
│  │  │  - engine.ts: state machine, check/checkmate       │    │ │
│  │  │  - types.ts: piece types, positions, moves         │    │ │
│  │  │  - notation.ts: Cờ Tướng algebraic notation         │    │ │
│  │  │  - No React/database dependencies                    │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │           Player Identity Manager                   │    │ │
│  │  │  - UUID v4 generation (v4 module)                   │    │ │
│  │  │  - localStorage persistence                         │    │ │
│  │  │  - Display name management                          │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │           WebSocket Client                          │    │ │
│  │  │  - Native WebSocket (browser native)               │    │ │
│  │  │  - Auto-reconnect with exponential backoff          │    │ │
│  │  │  - Heartbeat every 30s                              │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ HTTP REST + WebSocket            │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FastAPI Backend (apps/api)                     │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐   │ │
│  │  │ /rooms CRUD  │  │ /games CRUD   │  │ /ws/game       │   │ │
│  │  │               │  │               │  │ (WebSocket)   │   │ │
│  │  └──────────────┘  └───────────────┘  └────────────────┘   │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │           Game Service                              │    │ │
│  │  │  - Move validation (server-authoritative)          │    │ │
│  │  │  - Check/checkmate detection                       │    │ │
│  │  │  - Turn state machine                              │    │ │
│  │  │  - Timer management                                │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │           MongoDB Service                           │    │ │
│  │  │  - motor (async MongoDB driver)                    │    │ │
│  │  │  - Connection pooling                              │    │ │
│  │  │  - Auto-save on move                               │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ MongoDB Protocol                 │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              MongoDB Atlas (10.60.184.61:27017)             │ │
│  │  ┌──────────────┐  ┌─────────────────────────────────┐    │ │
│  │  │ rooms        │  │ games                           │    │ │
│  │  │ collection   │  │ collection                      │    │ │
│  │  └──────────────┘  └─────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Frontend Architecture

### 2.1 Pages/Routes
| Route | Type | Description |
|-------|------|-------------|
| `/` | SSG | Landing + lobby (room list, create/join buttons) |
| `/room/[roomId]` | CSR | Main game page with board and player panels |
| `/match/[gameId]` | CSR | Past match replay from move history |
| API routes | RSC | Reserved for future SSR needs |

### 2.2 Component Hierarchy
```
apps/web/
├── app/
│   ├── layout.tsx                 # Root layout, fonts, global providers
│   ├── page.tsx                   # Lobby page (SSG)
│   ├── globals.css
│   └── room/
│       └── [roomId]/
│           └── page.tsx          # Game room (client component)
├── components/
│   ├── ui/                        # Generic UI primitive components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   └── game/                      # Game-specific UI components
│       ├── GameBoard.tsx          # 10x9 grid board
│       ├── Piece.tsx              # Individual piece (SVG-based)
│       ├── PlayerPanel.tsx        # Player info, timer, status
│       ├── MoveHistory.tsx        # Scrollable move notation list
│       ├── RoomCard.tsx           # Lobby room listing card
│       ├── RulesModal.tsx        # Piece movement diagrams
│       └── GameEndModal.tsx       # Win/loss/draw screen
├── lib/
│   ├── mongodb.ts                 # DB singleton utility
│   ├── player.ts                  # Anonymous UUID management
│   └── co-tuong/
│       ├── types.ts               # Piece, Position, Move, GameState types
│       ├── rules.ts               # Move validators per piece type
│       ├── engine.ts              # Full game state machine
│       ├── notation.ts            # Cờ Tướng notation conversion
│       └── initial-board.ts       # Standard starting position
├── hooks/
│   ├── useGameWebSocket.ts        # WS connection + message handling
│   ├── useGameState.ts            # Local game state management
│   └── useLocalPlayer.ts          # Player identity from localStorage
└── models/
    └── (none — backend owns models)
```

### 2.3 State Management Approach
- **Server State**: React Query v5 for API data fetching + caching
- **Client State**: React `useState`/`useReducer` for UI state
- **Game State**: WebSocket-synchronized, server-authoritative
- **URL State**: `roomId` in URL path for shareability
- **Identity**: `localStorage` for anonymous player UUID + name

## 3. Backend Architecture

### 3.1 API Endpoints Design

#### Room Management
```
POST /api/rooms
  Body: { name: string, isPrivate: boolean }
  Response 201: { id, name, code, isPrivate, createdAt }
  Creates room, returns 6-char alphanumeric code

GET /api/rooms
  Response 200: { rooms: Room[] }
  Returns public rooms with open slots

GET /api/rooms/{roomId}
  Response 200: { id, name, code, players, status, gameId }
  Returns room details + current game if started

DELETE /api/rooms/{roomId}
  Response 200: { success: true }
  Deletes room (owner only)
```

#### Game Management
```
POST /api/rooms/{roomId}/join
  Body: { playerId: string, playerName: string }
  Response 200: { game: GameState, playerIndex: number }
  Player joins room; if 2 players, game auto-starts

POST /api/games
  Body: { roomId: string, playerId: string }
  Response 201: { id: string, board, status, ... }
  Legacy endpoint — prefer room join flow

POST /api/games/{gameId}/move
  Body: { playerId: string, move: Move }
  Response 200: { success: true, game: GameState }
  Validates + applies move, returns updated state
  Error 400: { success: false, error: "INVALID_MOVE", message: "..." }
  Error 403: { success: false, error: "NOT_YOUR_TURN", ... }

GET /api/games/{gameId}
  Response 200: { game: GameState }
  Returns full game state for reconnect/spectate
```

#### WebSocket Real-time
```
WS /ws/game/{gameId}?playerId={playerId}
  Bidirectional: move events, game state broadcasts
  Messages sent by server: game_update, player_joined, game_over
  Messages sent by client: move_submission, ping
```

### 3.2 Data Models (Backend — Pydantic + MongoDB)

#### Room Document
```python
# apps/api/models/room.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class Player(BaseModel):
    id: str            # UUID
    name: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class Room(BaseModel):
    id: str            # MongoDB ObjectId as string
    name: str
    code: str          # 6-char alphanumeric
    is_private: bool = False
    max_players: int = 2
    players: list[Player] = []
    game_id: Optional[str] = None
    status: Literal["lobby", "full", "playing"] = "lobby"
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

#### Game Document
```python
# apps/api/models/game.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class MoveRecord(BaseModel):
    move: dict         # { from, to, piece, captured, notation }
    player_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class GameResult(BaseModel):
    winner: int        # Player index (0 or 1)
    reason: str        # "checkmate", "timeout", "resign", "agreement"

class Game(BaseModel):
    id: str
    room_id: str
    players: list[dict] # [{ id, name, isHost }]
    board: list[list[Optional[dict]]]  # 10x9 grid
    current_turn: int = 0
    moves: list[MoveRecord] = []
    status: Literal["waiting", "playing", "finished"] = "waiting"
    result: Optional[GameResult] = None
    time_banks: dict = {"0": 300, "1": 300}  # 5-min each
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

## 4. Real-time Communication Strategy

### 4.1 Chosen Approach: WebSocket (FastAPI native)
WebSocket chosen over SSE for bidirectional capability — moves sent as WS messages, not HTTP POSTs. This is cleaner for turn-based games where moves must be validated server-side before broadcast.

### 4.2 Connection Flow
1. Client connects: `WS /ws/game/{gameId}?playerId={playerId}&token={roomCode}`
2. Server validates player is in the game's room
3. Server sends current game state as first message
4. On each move: client sends move → server validates → broadcasts to all players
5. Heartbeat: ping/pong every 30s to detect stale connections
6. On disconnect: server marks player as disconnected (not removed); game timers continue
7. Reconnect: client reconnects → receives last known state

### 4.3 Broadcast Groups
- All players in game receive full game state on each update
- Spectators receive reduced state (no time banks) — future scope

## 5. Deployment Architecture

### 5.1 Monorepo Structure (Bun)
```
games/co-tuong-online/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/co-tuong/
│   │   ├── hooks/
│   │   └── package.json
│   └── api/                  # FastAPI backend
│       ├── main.py
│       ├── models/
│       ├── routers/
│       ├── services/
│       └── requirements.txt
├── package.json              # Bun workspace root
├── bun.lockb
└── .gitignore
```

### 5.2 Deployment Targets
```
Cloudflare CDN
    ├── Vercel         → apps/web/ Next.js frontend
    └── Railway/Render → apps/api/ FastAPI backend
           │
           └── MongoDB (10.60.184.61:27017)
```

### 5.3 Environment Variables
```env
# apps/web/.env.local
NEXT_PUBLIC_WS_URL=wss://api.co-tuong-online.railway.app/ws

# apps/api/.env
MONGODB_URL=mongodb://10.60.184.61:27017
MONGODB_DB=co_tuong_online
```

---

## 6. Cờ Tướng Rules Summary (for Reference)

### Board: 10 columns × 9 rows (transposed visually as 9×10)
- Red side: rows 0–4 (top)
- Black side: rows 5–9 (bottom)

### Pieces (7 types)
| Vietnamese | English | Count | Move Rule |
|------------|---------|-------|-----------|
| Giữ chắn | General (King) | 1 | 1 step orthogonal within palace |
| Tượng/Sĩ | Advisor | 2 | 1 step diagonal within palace |
| Tượng | Elephant | 2 | 2 steps diagonally (river blocked) |
| Xe | Chariot (Rook) | 2 | Any steps orthogonal |
| Mã | Horse | 2 | 1 orthogonal + 1 diagonal (jumps) |
| Pháo | Cannon | 2 | Orthogonal, jumps single piece to capture |
| Tốt/Chốt | Soldier | 5 | Forward 1 (crossed river: also sideways 1) |
