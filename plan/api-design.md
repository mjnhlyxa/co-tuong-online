# co-tuong-online — API Design

> **C4 Level**: 3 — Component Specification (API)

## 1. API Overview

**Base URL (Production)**: `https://api.co-tuong-online.railway.app`

Local development: `http://localhost:8000`

All endpoints return JSON. Anonymous play — no Authorization header required.

## 2. REST Endpoints

### 2.1 Room Endpoints

#### POST /api/rooms — Create a New Room

**Request:**
```json
{
  "name": "Phòng của Minh",
  "isPrivate": false,
  "playerName": "Minh"
}
```

**Response (201 Created):**
```json
{
  "id": "665a1b2c3d4e5f6a7b8c9d0e",
  "name": "Phòng của Minh",
  "code": "X7K2M1",
  "isPrivate": false,
  "maxPlayers": 2,
  "players": [
    { "id": "player-uuid-minh", "name": "Minh", "isHost": true }
  ],
  "status": "lobby",
  "createdAt": "2026-05-29T10:00:00Z"
}
```

**Error Responses:**
- 400: Invalid request body (missing name, name too long)

#### GET /api/rooms — List Open Public Rooms

**Response (200 OK):**
```json
{
  "rooms": [
    {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Phòng của Minh",
      "code": "X7K2M1",
      "players": [{ "id": "player-uuid", "name": "Minh" }],
      "maxPlayers": 2,
      "status": "lobby"
    }
  ]
}
```

#### GET /api/rooms/{roomIdOrCode} — Get Room Details

Accepts either MongoDB `_id` or the 6-char room `code`.

**Response (200 OK):**
```json
{
  "id": "665a1b2c3d4e5f6a7b8c9d0e",
  "name": "Phòng của Minh",
  "code": "X7K2M1",
  "isPrivate": false,
  "currentPlayers": [
    { "id": "uuid-1", "name": "Minh", "isHost": true },
    { "id": "uuid-2", "name": "Hùng", "isHost": false }
  ],
  "gameId": "665a1b2c3d4e5f6a7b8c9d0f",
  "status": "playing",
  "shareUrl": "https://co-tuong-online.vercel.app/room/X7K2M1"
}
```

**Error Responses:**
- 404: Room not found

#### DELETE /api/rooms/{roomId} — Delete Room (Owner Only)

**Request Header:** `X-Player-Id: <player-uuid>`

**Response (200 OK):**
```json
{ "success": true, "message": "Room deleted" }
```

**Error Responses:**
- 403: Not room owner
- 404: Room not found

### 2.2 Game Endpoints

#### POST /api/rooms/{roomId}/join — Join a Room

**Request:**
```json
{
  "playerId": "player-uuid",
  "playerName": "Hùng"
}
```

**Response (200 OK — player joined, game not started):**
```json
{
  "game": null,
  "playerIndex": 1,
  "room": {
    "id": "...",
    "players": [...],
    "status": "lobby"
  }
}
```

**Response (200 OK — second player joined, game starts):**
```json
{
  "game": {
    "id": "665a1b2c3d4e5f6a7b8c9d0f",
    "board": [[...], ..., [...]],  // 10x9 initial
    "currentTurn": 0,
    "players": [...],
    "status": "playing",
    "timeBanks": {"0": 300, "1": 300}
  },
  "playerIndex": 1,
  "room": { "status": "playing", ... }
}
```

**Error Responses:**
- 404: Room not found
- 409: Room full or game already started

#### GET /api/games/{gameId} — Get Game State

Used for reconnect, spectate, and initial load.

**Response (200 OK):**
```json
{
  "id": "665a1b2c3d4e5f6a7b8c9d0f",
  "roomId": "665a1b2c3d4e5f6a7b8c9d0e",
  "board": [[null, "RED_CHARIOT", ...], ...],  // 10-rows of 9-col arrays
  "currentTurn": 0,
  "players": [
    { "id": "uuid-1", "name": "Minh", "isHost": true },
    { "id": "uuid-2", "name": "Hùng", "isHost": false }
  ],
  "moves": [
    {
      "fromPos": {"row": 9, "col": 0},
      "toPos": {"row": 5, "col": 0},
      "piece": "BLACK_CHARIOT",
      "captured": null,
      "notation": "Xe9.1",
      "playerId": "uuid-2",
      "timestamp": "2026-05-29T10:01:00Z"
    }
  ],
  "status": "playing",
  "result": null,
  "timeBanks": {"0": 285, "1": 290}
}
```

**Error Responses:**
- 404: Game not found

#### POST /api/games/{gameId}/move — Submit a Move

**Request:**
```json
{
  "playerId": "uuid-2",
  "move": {
    "from": {"row": 9, "col": 0},
    "to": {"row": 5, "col": 0}
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "game": { /* full updated game state */ },
  "move": {
    "fromPos": {"row": 9, "col": 0},
    "toPos": {"row": 5, "col": 0},
    "piece": "BLACK_CHARIOT",
    "captured": null,
    "notation": "Xe9.1",
    "playerId": "uuid-2",
    "timestamp": "2026-05-29T10:01:30Z"
  }
}
```

**Error Responses:**
- 400: `{ "success": false, "error": "INVALID_MOVE", "message": "Chariot cannot move diagonally" }`
- 403: `{ "success": false, "error": "NOT_YOUR_TURN", "message": "It is not your turn" }`
- 403: `{ "success": false, "error": "GAME_NOT_ACTIVE", "message": "Game has already ended" }`
- 404: Game not found

#### GET /api/games/history — Get Player Match History

**Request Header:** `X-Player-Id: <player-uuid>`

**Response (200 OK):**
```json
{
  "games": [
    {
      "id": "...",
      "opponent": { "id": "uuid-opp", "name": "Hùng" },
      "result": { "winner": 0, "reason": "checkmate" },
      "movesCount": 42,
      "createdAt": "2026-05-28T15:00:00Z"
    }
  ]
}
```

## 3. WebSocket Endpoint

### WS /ws/game/{gameId}?playerId={playerId}&token={roomCode}

#### 3.1 Connection
Client connects on game page mount. Server validates:
- `playerId` is in the game's players list
- `roomCode` matches the parent room code

Connection rejected → server closes WebSocket with code 4001.

#### 3.2 Server → Client Messages

**Initial state (on connect):**
```json
{
  "type": "game_state",
  "payload": { /* full GameState */ }
}
```

**Game update (on move):**
```json
{
  "type": "game_update",
  "payload": {
    "game": { /* full updated game state */ },
    "lastMove": { /* MoveRecord */ },
    "timestamp": "2026-05-29T10:01:30Z"
  }
}
```

**Player status change:**
```json
{
  "type": "player_status",
  "payload": {
    "playerId": "uuid-2",
    "connected": true
  }
}
```

**Game over:**
```json
{
  "type": "game_over",
  "payload": {
    "winner": 1,
    "reason": "checkmate",
    "message": "Hùng wins by checkmate!"
  }
}
```

**Ping (heartbeat):**
```json
{ "type": "ping", "payload": { "timestamp": 1716974400000 } }
```

#### 3.3 Client → Server Messages

**Submit move:**
```json
{
  "type": "move",
  "payload": {
    "from": {"row": 9, "col": 0},
    "to": {"row": 5, "col": 0}
  }
}
```

**Join as spectator:**
```json
{
  "type": "spectate",
  "payload": { "playerId": "spectator-uuid" }
}
```

**Pong (response to ping):**
```json
{ "type": "pong" }
```

## 4. Error Response Format

All errors follow consistent shape:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable Vietnamese message",
  "details": {}
}
```

## 5. Error Codes Reference

| HTTP | Error Code | Vietnamese Message |
|------|-----------|--------------------|
| 400 | INVALID_REQUEST | Yêu cầu không hợp lệ |
| 400 | INVALID_MOVE | Nước đi không hợp lệ |
| 400 | INVALID_ROOM_CODE | Mã phòng không hợp lệ |
| 403 | NOT_YOUR_TURN | Chưa đến lượt bạn đi |
| 403 | NOT_GAME_OWNER | Chỉ chủ phòng mới được thực hiện |
| 403 | GAME_NOT_ACTIVE | Ván đấu đã kết thúc |
| 403 | ROOM_FULL | Phòng đã đầy |
| 403 | ALREADY_IN_GAME | Bạn đã ở trong một ván đấu khác |
| 404 | ROOM_NOT_FOUND | Không tìm thấy phòng |
| 404 | GAME_NOT_FOUND | Không tìm thấy ván đấu |
| 409 | GAME_ALREADY_STARTED | Ván đấu đã bắt đầu |
| 429 | RATE_LIMITED | Quá nhiều yêu cầu, thử lại sau |
| 4001 | WS_AUTH_FAILED | Xác thực thất bại |
