# co-tuong-online — Real-time Communication Design

> **C4 Level**: 3 — Real-time Component Design

## 1. Approach Selection

### Options for Real-time in Turn-based Games

| Approach | Latency | Implementation | Scalability | Cons |
|---------|---------|---------------|-------------|------|
| Polling only | 3–5s | Simple | Needs caching | Too slow for timers |
| SSE only | <500ms | Medium | One-way only | WS better for games |
| WebSocket | <500ms | Medium | Needs WS server | Best for games |
| Hybrid (WS + polling fallback) | <500ms | Complex | Good | Best overall |

**Chosen: Hybrid WebSocket + Polling Fallback**

- Primary: WebSocket — for live move updates and low latency timers
- Fallback: 3-second polling — for connection drops and server restarts

## 2. WebSocket Architecture (FastAPI)

### 2.1 Server Setup
```python
# apps/api/main.py — WebSocket route
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/game/{game_id}")
async def websocket_game(websocket: WebSocket, game_id: str, player_id: str = None, token: str = None):
    await websocket.accept()
    # Validate player against game
    # Register in connection manager
    try:
        while True:
            data = await websocket.receive_json()
            await handle_client_message(websocket, game_id, player_id, data)
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket, game_id, player_id)
```

### 2.2 Connection Manager
```python
# apps/api/services/connection_manager.py
class ConnectionManager:
    def __init__(self):
        # game_id -> list of (websocket, player_id, is_spectator)
        self.active_connections: dict[str, list] = {}

    async def connect(self, websocket, game_id, player_id, is_spectator=False):
        self.active_connections.setdefault(game_id, []).append((websocket, player_id, is_spectator))

    async def broadcast(self, game_id, message, exclude_player_id=None):
        for ws, pid, is_spectator in self.active_connections.get(game_id, []):
            if pid != exclude_player_id:
                await ws.send_json(message)

    async def broadcast_full game_state(self, game_id):
        game = await game_service.get_game(game_id)
        await self.broadcast(game_id, {
            "type": "game_update",
            "payload": {"game": game}
        })
```

### 2.3 Message Flow

**Client → Server:**
1. `move` message → validate move → apply to game state → broadcast to all
2. `ping` message → respond with `pong`

**Server → Client:**
1. On connect: full game state
2. On any player action: updated game state
3. On timer events: time bank update
4. On disconnect: mark player disconnected (don't remove from game)

## 3. Polling Fallback

### 3.1 When to Use

```typescript
// apps/web/hooks/useGameSync.ts
export function useGameSync(gameId: string) {
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Try WebSocket first
    const ws = connectWebSocket(gameId, playerId);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      activatePolling();
    };
  }, [gameId]);
}

// React Query continues polling regardless (best effort)
// When WS is active, ignore polling results (WS authoritative)
// When WS drops, React Query results update the UI seamlessly
```

### 3.2 Endpoint for Polling
```
GET /api/games/{gameId}
  Response: full GameState object
  Polling interval: 3000ms (3 seconds)
```

## 4. Heartbeat & Keep-Alive

```python
# Server-side heartbeat task
async def heartbeat(websocket):
    while True:
        await websocket.send_json({"type": "ping", "timestamp": time.time()})
        await asyncio.sleep(30)  # every 30 seconds
```

- Client responds with `pong` message
- If no `pong` received within 10 seconds after 3 attempts → close connection
- Server closes connections older than 5 minutes with no activity

## 5. Connection Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max WS connections per game | 10 | Spectator support |
| Max total WS connections | 1000 | Server resource |
| Max rooms per player | 2 | Prevent multi-room abuse |

## 6. Reconnection Sequence

```
Client disconnects (WS close event)
  │
  ▼
Mark UI as "reconnecting"
  │
  ▼
Call GET /api/games/{gameId} — restore current state via polling (1 attempt)
  │
  ▼
Attempt WS reconnect (exponential backoff: 1, 2, 4, 8, 16, 30s max)
  │
  ▼
On WS open: invalidate React Query → fresh fetch → render
```

## 7. Disconnect Handling

- Player disconnects: mark as `connected: false` in game document
- Timers continue running (server-authoritative)
- If player reconnects within 60 seconds: resume without state loss
- After 60 seconds: game continues, player marked as absent
- Player can rejoin as spectator after game ends

---

## 8. Cờ Tướng Move Validation (Server-side Reference)

For WebSocket move handler — server validates each move:

```python
# apps/api/services/game_rules.py
class CoTuongRules:
    @staticmethod
    def is_valid_move(board, from_pos, to_pos, player_color) -> tuple[bool, str]:
        piece = board[from_pos.row][from_pos.col]
        if not piece or piece.color != player_color:
            return False, "Not your piece"

        validation_fn = {
            "GENERAL":    validate_general,
            "ADVISOR":    validate_advisor,
            "ELEPHANT":   validate_elephant,
            "CHARIOT":    validate_chariot,
            "HORSE":      validate_horse,
            "CANNON":     validate_cannon,
            "SOLDIER":    validate_soldier,
        }.get(piece.type)

        if not validation_fn:
            return False, "Unknown piece type"
        return validation_fn(board, from_pos, to_pos, piece)

    @staticmethod
    def is_in_check(board, player_color) -> bool:
        """Find the GENERAL for player_color, check if any enemy piece attacks it."""

    @staticmethod
    def is_checkmate(board, player_color) -> bool:
        """For each piece the player owns, see if any legal move resolves the check."""
```

This is the engine referenced during move validation on the server side before broadcasting.
