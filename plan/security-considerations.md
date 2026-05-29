# co-tuong-online — Security Considerations

> **C4 Level**: 3 — Security Components

## 1. Anonymous Player Identity

- **UUID v4 generation**: 122-bit random numbers — unguessable
- **Storage**: localStorage only (no server-side identity)
- **No PII**: name field is optional/display-only; no email, no phone
- **No account system**: no auth tokens, no sessions, no passwords

### Identity Flow
```typescript
// Client generates UUID on first visit
const playerId = crypto.randomUUID();
// Stored in localStorage['co_tuong_player'] = { id, name }
// Sent with every request as X-Player-Id header or query param
```

## 2. Input Validation

### REST Endpoints (Pydantic)
All request bodies validated with Pydantic models:
```python
# All fields typed, max lengths enforced, enums validated
class JoinRoomRequest(BaseModel):
    playerId: str = Field(min_length=20, max_length=50)
    playerName: str = Field(max_length=30)
```

### WebSocket Messages
```python
# Parse and validate all incoming WS JSON
class MovePayload(BaseModel):
    from_pos: dict
    to_pos: dict
    # Ranges validated: row 0-9, col 0-8
```

### Board Position Validation
Every move's `from` and `to` coordinates validated:
- `0 <= row <= 9`
- `0 <= col <= 8`
- Source cell must contain a piece of the right color
- Target must be accessible per piece movement rules

## 3. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/games/*/move` | 1 move | 1 second |
| `POST /api/rooms/*/join` | 1 join | 10 seconds |
| WebSocket messages | 1 move | 1 second |
| All other | 100 req | 1 minute |

Implementation: in-memory counter per IP/playerId (FastAPI middleware)
For production: Vercel Rate Limit headers or middleware

## 4. CORS Configuration

```python
# FastAPI CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://co-tuong-online.vercel.app", "http://localhost:3000"],
    allow_methods=["GET", "POST", "WS", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

## 5. WebSocket Authentication

- Player connects with `?playerId={id}&token={roomCode}`
- Server validates:
  1. `playerId` exists in the game's players list
  2. `roomCode` matches the parent room's code
- Invalid → server closes with WebSocket code `4001`
- Valid → connection registered, receives game state

```python
# apps/api/routers/websocket.py
@app.websocket("/ws/game/{game_id}")
async def websocket_game(websocket: WebSocket, game_id: str, player_id: str = None, token: str = None):
    # Validate the token (room code) matches game
    game = await game_service.get_game(game_id)
    room = await room_service.get_room(game.room_id)
    if not room or room.code != token:
        await websocket.close(code=4001)
        return
    # Validate player is in game
    if player_id not in [p['id'] for p in game.players]:
        await websocket.close(code=4001)
        return
    await websocket.accept()
```

## 6. Move Validation (Anti-Cheat)

All moves validated server-side before persisting to MongoDB:
1. Check it's the player's turn
2. Check the move source contains their piece
3. Check the move destination complies with piece-specific rules
4. Check move doesn't leave their General in check

Any invalid move rejected with `400 INVALID_MOVE`.

## 7. Spectator Mode

- Spectators connect via `?playerId=&token={roomCode}&spectate=true`
- Player ID not required
- Read-only: server ignores any `move` messages from spectators
- No time bank info broadcast to spectators

## 8. Environment Variables

```env
# apps/api/.env (backend — never committed)
MONGODB_URL=mongodb://10.60.184.61:27017
MONGODB_DB=co_tuong_online
ALLOWED_ORIGINS=https://co-tuong-online.vercel.app

# apps/web/.env.local (frontend — public values only)
NEXT_PUBLIC_WS_URL=wss://api.co-tuong-online.railway.app/ws
NEXT_PUBLIC_API_URL=https://api.co-tuong-online.railway.app
```

## 9. Security Summary

| Concern | Mitigation |
|---------|-----------|
| Identity spoofing | UUID validation, WebSocket auth per room code |
| Move cheating | Server-side rule validation for every move |
| Spam/DoS | Rate limiting on move endpoints |
| Board state tampering | Server-authoritative state; client is display-only |
| Spectator cheating | Read-only WS, no game-affecting messages accepted |
| Private room leaks | `is_private` only hides from lobby list; code still required |
