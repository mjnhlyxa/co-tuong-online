# co-tuong-online — Database Schema Design

> **C4 Level**: 3 — Component Specification (Database)

## 1. Database Overview

### 1.1 Technology
- **Database**: MongoDB 6.x (standalone, not Atlas-hosted)
- **Driver**: Motor (async Python driver for FastAPI)
- **Host**: `10.60.184.61` — port `27017`
- **Database Name**: `co_tuong_online`

### 1.2 Collections Summary
| Collection | Purpose | Est. Doc Size | Growth Rate |
|-----------|---------|---------------|-------------|
| rooms | Active game rooms | ~800B | ~30/day |
| games | Active and completed games | ~3KB | ~30/day |
| players | Player identity & stats | ~200B | ~100/day |

## 2. Schema Definitions

### 2.1 Room Schema (rooms collection)

```python
# apps/api/models/room.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Player(BaseModel):
    id: str
    name: str = "Anonymous"
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class Room(BaseModel):
    id: Optional[str] = None  # Set by MongoDB
    name: str = Field(max_length=50)
    code: str = Field(max_length=6)  # e.g. "X7K2M"
    is_private: bool = False
    max_players: int = Field(default=2, ge=2, le=10)
    players: list[Player] = []
    game_id: Optional[str] = None
    status: str = "lobby"  # "lobby" | "full" | "playing" | "finished"
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**MongoDB document shape:**
```json
{
  "_id": {"$oid": "665a1b2c3d4e5f6a7b8c9d0e"},
  "name": "Phòng của Minh",
  "code": "X7K2M1",
  "is_private": false,
  "max_players": 2,
  "players": [
    { "id": "uuid-1", "name": "Minh", "joined_at": "2026-05-29T10:00:00Z" },
    { "id": "uuid-2", "name": "Hùng", "joined_at": "2026-05-29T10:01:00Z" }
  ],
  "game_id": "665a1b2c3d4e5f6a7b8c9d0f",
  "status": "playing",
  "created_at": {"$date": "2026-05-29T10:00:00Z"}
}
```

**Indexes:**
```javascript
db.rooms.createIndex({ "code": 1 }, { unique: true });
db.rooms.createIndex({ status: 1, is_private: 1 });
db.rooms.createIndex({ created_at: -1 });
```

### 2.2 Game Schema (games collection)

```python
# apps/api/models/game.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class MoveRecord(BaseModel):
    from_pos: dict = {"row": int, "col": int}
    to_pos: dict = {"row": int, "col": int}
    piece: str           # e.g., "RED_ROOK", "BLACK_GENERAL"
    captured: Optional[str] = None
    notation: str       # e.g., "Xe2+1" or "Phao5.10"
    player_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class GameResult(BaseModel):
    winner: Optional[int] = None  # 0 or 1
    reason: str = "unknown"

class Game(BaseModel):
    id: Optional[str] = None
    room_id: str
    board: list = Field(default_factory=list)  # 10x9 grid
    current_turn: int = 0
    players: list = []
    moves: list[MoveRecord] = []
    status: str = "waiting"  # "waiting" | "playing" | "finished"
    result: Optional[GameResult] = None
    time_banks: dict = {"0": 300, "1": 300}  # seconds per player
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Board Representation:**
The 10×9 board stored as `board[row][col]`:
- `row 0–4`: Red side (top)
- `row 5–9`: Black side (bottom)
- Each cell: `null` (empty) or a piece object:
```json
{
  "piece": "RED_ROOK",
  "color": "RED",  // "RED" | "BLACK"
  "type": "ROOK"
}
```

**MongoDB document shape:**
```json
{
  "_id": {"$oid": "665a1b2c3d4e5f6a7b8c9d0f"},
  "room_id": {"$oid": "665a1b2c3d4e5f6a7b8c9d0e"},
  "board": [
    [{"piece": "BLACK_CHARIOT", "color": "BLACK", "type": "CHARIOT"}, null, ...],  // row 0
    // ... 10 rows total (rows 0-4: black, rows 5-9: red at bottom)
  ],
  "current_turn": 0,
  "players": [
    { "id": "uuid-1", "name": "Minh", "isHost": true },
    { "id": "uuid-2", "name": "Hùng", "isHost": false }
  ],
  "moves": [
    {
      "from_pos": {"row": 9, "col": 0},
      "to_pos": {"row": 5, "col": 0},
      "piece": "BLACK_CHARIOT",
      "captured": null,
      "notation": "Xe9.1",
      "player_id": "uuid-2",
      "timestamp": {"$date": "2026-05-29T10:01:00Z"}
    }
  ],
  "status": "playing",
  "result": null,
  "time_banks": {"0": 285, "1": 290},
  "created_at": {"$date": "2026-05-29T10:00:00Z"},
  "updated_at": {"$date": "2026-05-29T10:01:00Z"}
}
```

**Indexes:**
```javascript
db.games.createIndex({ "room_id": 1 });
db.games.createIndex({ "players.id": 1 });
db.games.createIndex({ status: 1, created_at: -1 });
db.games.createIndex({ "game_id": 1 });  // for game lookups
```

### 2.3 Player Schema (players collection — future scope)

```python
class PlayerStats(BaseModel):
    total_games: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0

class Player(BaseModel):
    id: str  # UUID
    name: str = "Anonymous"
    display_name: Optional[str] = None
    stats: PlayerStats = PlayerStats()
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

## 3. Query Patterns & Indexes

### 3.1 Common Queries
| Query | Collection | Index Used |
|-------|-----------|-----------|
| Get room by 6-char code | rooms | `code_1` (unique) |
| List open public rooms | rooms | `status_1, is_private_1` |
| Get game by room ID | games | `room_id_1` |
| Get player's match history | games | `players.id_1` |
| Recent games (lobby) | games | `status_1, created_at_-1` |
| Get game by ID | games | `_id` (primary) |

### 3.2 TTL / Auto-Cleanup
```javascript
// Auto-delete empty rooms after 24 hours
db.rooms.createIndex({ "created_at": 1 }, { expireAfterSeconds: 86400 });

// Auto-archive finished games after 90 days (set a flag, not delete)
// Note: MongoDB TTL can't move docs; scheduled job handles this
```

## 4. Data Migrations Strategy

- **Backward compatibility**: All schema changes add new fields with defaults
- **Breaking changes**: Versioned migration scripts in `apps/api/migrations/`
- **No ORM migrations**: Manual review + applied directly to MongoDB

## 5. Data Retention

| Data Type | Retention | Auto-Delete |
|-----------|-----------|-------------|
| Active games | Until game ends | No — manual cleanup |
| Finished games | 90 days | Yes — TTL index + cron job |
| Rooms (empty) | 24 hours | Yes — TTL index |
| Move history | — | Same as parent game |

---

## Cờ Tướng Piece Movement Rules (for schema reference)

### Palace Zones (General & Advisors only)
- **Red Palace**: rows 0–2, cols 3–5
- **Black Palace**: rows 7–9, cols 3–5

### Elephant Movement
- 2 diagonal steps: first step MUST be adjacent diagonal (river check)
- **River blocked**: cannot pass row 4 (Red→Black boundary)

### Soldier (Pedestrian) Movement
- **Before river (row > 4)**: forward 1 only
- **After crossing river (row <= 4)**: forward 1 OR sideways 1

### Cannon Movement
- Orthogonal movement (like Chariot)
- To capture: must jump exactly 1 piece between start and target
- To move without capture: no pieces in path

```python
PIECE_MOVES = {
    "GENERAL": {"directions": [(0,1),(0,-1),(1,0),(-1,0)], "range": 1, "palace": True},
    "ADVISOR": {"directions": [(1,1),(1,-1),(-1,1),(-1,-1)], "range": 1, "palace": True},
    "ELEPHANT": {"directions": [(1,1),(1,-1),(-1,1),(-1,-1)], "range": 2, "river_blocked": True},
    "CHARIOT": {"directions": [(0,1),(0,-1),(1,0),(-1,0)], "range": 9, "palace": False},
    "HORSE": {"directions": [(0,1),(0,-1),(1,0),(-1,0)], "range": 1, "horse_jump": True},
    "CANNON": {"directions": [(0,1),(0,-1),(1,0),(-1,0)], "range": 9, "must_jump": True},
    "SOLDIER": {"directions": [(1,0),(-1,0),(0,1),(0,-1)], "range": 1, "river_sides": True},
}
```
