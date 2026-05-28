# API Design — Cờ Tướng Online

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://[domain]/api`

---

## Rooms

### GET /api/rooms
List phòng public đang chờ người chơi.

**Response**:
```json
{
  "rooms": [
    {
      "roomId": "a1b2c3...",
      "host": { "name": "Rồng Đỏ" },
      "type": "public",
      "status": "waiting",
      "createdAt": "2026-05-23T10:00:00Z"
    }
  ]
}
```

Chỉ trả về phòng `type=public, status=waiting`. Giới hạn 20 phòng, sort theo `createdAt DESC`.

---

### POST /api/rooms
Tạo phòng mới.

**Request body**:
```json
{
  "type": "public" | "private",
  "hostPlayerId": "uuid-from-localstorage",
  "hostName": "Rồng Đỏ"
}
```

**Response 201**:
```json
{
  "roomId": "new-room-uuid",
  "shareLink": "/game/new-room-uuid",
  "type": "public"
}
```

---

### GET /api/rooms/[roomId]
Lấy thông tin phòng. Nếu phòng đang `waiting` và request có `guestPlayerId`, tự động join.

**Query params**: `?playerId=uuid`

**Response**:
```json
{
  "roomId": "...",
  "type": "public",
  "status": "waiting" | "playing" | "finished",
  "host": { "playerId": "...", "name": "Rồng Đỏ", "color": "red" },
  "guest": { "playerId": "...", "name": "Mây Đen", "color": "black" },
  "gameStarted": false
}
```

**Auto-join logic** (server-side):
- Nếu `status=waiting` và `guest.playerId=null` và `playerId != host.playerId`:
  → Set guest, đổi status → `playing`, tạo document `games`

---

## Games

### GET /api/games/[roomId]
Game state đầy đủ — dùng bởi SWR polling mỗi 1.5s.

**Query params**: `?playerId=uuid`

**Response**:
```json
{
  "roomId": "...",
  "status": "playing",
  "currentTurn": "red",
  "currentMoveNumber": 5,
  "boardState": [[...], ...],
  "moves": [
    {
      "moveNumber": 1,
      "color": "red",
      "from": { "row": 9, "col": 0 },
      "to": { "row": 7, "col": 0 },
      "notation": "Xe đỏ tiến 2",
      "isCheck": false
    }
  ],
  "redPlayer": { "name": "Rồng Đỏ" },
  "blackPlayer": { "name": "Mây Đen" },
  "winner": null,
  "endReason": null,
  "myColor": "red"   // Dựa trên playerId trong query, null nếu spectator
}
```

**Polling behavior**: Client dùng `useSWR` với `refreshInterval: 1500`. Nếu `status=finished`, stop polling.

---

### POST /api/games/[roomId]/move
Submit nước đi.

**Request body**:
```json
{
  "playerId": "uuid",
  "moveNumber": 5,
  "from": { "row": 9, "col": 0 },
  "to": { "row": 7, "col": 0 }
}
```

**Validation (server-side)**:
1. `playerId` = người được phép đi (match với `currentTurn`)
2. `moveNumber` = `currentMoveNumber` (optimistic lock)
3. Nước đi hợp lệ theo luật cờ tướng (gọi `xiangqi/rules.ts`)

**Response 200 (success)**:
```json
{
  "success": true,
  "moveNumber": 6,
  "notation": "Xe đỏ tiến 2",
  "isCheck": false,
  "winner": null
}
```

**Response 400 (invalid)**:
```json
{
  "success": false,
  "error": "INVALID_MOVE" | "WRONG_TURN" | "STALE_MOVE_NUMBER"
}
```

---

### POST /api/games/[roomId]/resign
Đầu hàng.

**Request body**: `{ "playerId": "uuid" }`

**Response**: `{ "success": true, "winner": "red" | "black" }`

---

### POST /api/games/[roomId]/spectate
Tham gia với tư cách người xem.

**Request body**: `{ "deviceId": "uuid", "name": "Người Xem" }`

**Response 200**: `{ "success": true, "role": "spectator" }`  
**Response 403**: `{ "error": "SPECTATORS_DISABLED" }` nếu `allowSpectators=false`

Nếu `deviceId` đã là player → trả về `{ "role": "player", "color": "red"|"black" }`.

---

### POST /api/games/[roomId]/chat
Gửi tin nhắn chat.

**Request body**: `{ "deviceId": "uuid", "message": "Hay quá!" }`

**Validation**: 
- `message` tối đa 200 ký tự
- `deviceId` phải là player hoặc spectator (đã join room)
- Nếu `deviceId` trong `mutedDeviceIds` → 403 `MUTED`

**Response 201**: `{ "success": true, "messageId": "uuid-..." }`

Server append vào `chat` array, giữ tối đa 100 entries gần nhất (dùng `$push + $slice`).

---

### POST /api/games/[roomId]/mute
Chủ phòng mute hoặc unmute chat của một người.

**Request body**: `{ "hostDeviceId": "uuid", "targetDeviceId": "uuid", "action": "mute" | "unmute" }`

**Auth**: `hostDeviceId` phải là `redPlayer.deviceId` (host luôn là đỏ).

**Response**: `{ "success": true }`

---

### POST /api/games/[roomId]/takeback-request
Yêu cầu hoãn nước vừa đi.

**Request body**: `{ "playerId": "uuid" }`

**Validation**:
- `allowTakeback=true`
- Không có takeback request đang pending
- Người yêu cầu vừa đi xong (không phải lượt của mình nữa)
- `takebacksUsed[color] < 3`

**Response 200**: `{ "success": true }`  
**Response 400**: `{ "error": "TAKEBACK_DISABLED" | "ALREADY_PENDING" | "LIMIT_REACHED" }`

Server set `takebackRequest = { fromColor, moveNumber: currentMoveNumber - 1, status: "pending", requestedAt }`.  
Đối thủ thấy qua polling → hiện thông báo.

---

### POST /api/games/[roomId]/takeback-response
Đối thủ đồng ý hoặc từ chối hoãn nước.

**Request body**: `{ "playerId": "uuid", "accept": true | false }`

**Auth**: `playerId` phải là opponent của người đã request.

**Response 200 (accept)**: 
```json
{ "success": true, "boardState": [[...]], "currentTurn": "red", "currentMoveNumber": 11 }
```

**Response 200 (reject)**: `{ "success": true, "accepted": false }`

Server logic khi accept:
1. Pop nước cuối khỏi `moves` array
2. Restore `boardState` về state trước nước đó
3. Flip `currentTurn` và decrement `currentMoveNumber`
4. Increment `takebacksUsed[fromColor]`
5. Set `takebackRequest = null`

---

### POST /api/games/[roomId]/heartbeat
Client gửi mỗi 10 giây để báo vẫn đang online. Server dùng để phát hiện người chơi bỏ đi.

**Request body**: `{ "playerId": "uuid" }`

**Response**: `{ "success": true }`

**Abandoned detection** (trong `GET /api/games/[roomId]`):
- Nếu game `status=playing` và `lastSeen[currentTurn]` > 30s trước:
  → Set `winner = opponent`, `endReason = "abandoned"`, `status = finished`
  → Trả về game state cập nhật (opponent được thắng)

---

---

## Players

### GET /api/players/[deviceId]
Lấy hoặc tạo player profile theo device ID.

**Response 200** (profile đã tồn tại):
```json
{
  "deviceId": "uuid-v4",
  "name": "Rồng Đỏ",
  "stats": {
    "wins": 12, "losses": 8, "draws": 2,
    "abandonedWins": 1, "abandonedLosses": 0, "totalGames": 23
  },
  "ranking": { "elo": 1542, "tier": "gold", "peakElo": 1580 },
  "preferences": { "language": "vi" }
}
```

**Response 200** (lần đầu — profile chưa tồn tại, trả về `null` để client biết cần hiện FirstVisitModal):
```json
{ "exists": false }
```

---

### POST /api/players
Tạo player profile lần đầu (sau khi user nhập tên trong FirstVisitModal).

**Request body**:
```json
{
  "deviceId": "uuid-v4",
  "name": "Rồng Đỏ",
  "language": "vi"
}
```

**Response 201**:
```json
{
  "deviceId": "uuid-v4",
  "name": "Rồng Đỏ",
  "ranking": { "elo": 1500, "tier": "gold" }
}
```

**Validation**: `name` 2-16 ký tự, `deviceId` phải là UUID v4 format.

---

### PUT /api/players/[deviceId]
Cập nhật tên hoặc ngôn ngữ.

**Request body** (chỉ các fields cần cập nhật):
```json
{
  "name": "Tên mới",
  "language": "en"
}
```

**Response 200**: Player object cập nhật (cùng format với GET).

---

## Leaderboard

### GET /api/leaderboard
Top players theo ELO.

**Query params**: `?limit=20&tier=gold` (tier là optional filter)

**Response**:
```json
{
  "players": [
    {
      "rank": 1,
      "name": "Thiên Long",
      "elo": 2104,
      "tier": "diamond",
      "stats": { "wins": 84, "losses": 21, "totalGames": 108 }
    }
  ],
  "updatedAt": "2026-05-23T10:00:00Z"
}
```

---

## Updated Endpoints

### GET /api/rooms (updated)
Thêm ELO/tier thông tin của host vào response. Thêm filter query params.

**Query params**: `?tier=gold&minElo=1400&maxElo=1600`

**Response rooms array** (updated):
```json
{
  "rooms": [
    {
      "roomId": "a1b2c3...",
      "host": { "name": "Rồng Đỏ", "elo": 1542, "tier": "gold" },
      "type": "public",
      "status": "waiting",
      "timeControl": 20,
      "createdAt": "2026-05-23T10:00:00Z"
    }
  ]
}
```

### POST /api/rooms (updated)
Thêm `timeControl`, `allowSpectators`, `allowTakeback` vào request.

**Request body** (updated):
```json
{
  "type": "public" | "private",
  "deviceId": "uuid-from-localstorage",
  "hostName": "Rồng Đỏ",
  "timeControl": 20,
  "allowSpectators": true,
  "allowTakeback": true
}
```

`timeControl`: số phút mỗi bên (10/20/30/40/50/60), hoặc `null` nếu không giới hạn.  
`allowSpectators`: người ngoài có thể vào xem (default `true`).  
`allowTakeback`: cho phép yêu cầu hoãn nước (default `true`).

### GET /api/games/[roomId] (updated)
Thêm time control, spectator, chat, takeback fields vào response.

**Response** (thêm fields):
```json
{
  "timeControl": 20,
  "timeRemaining": { "red": 1187000, "black": 1200000 },
  "lastMoveAt": "2026-05-23T10:05:30Z",
  "allowSpectators": true,
  "allowTakeback": true,
  "spectators": [
    { "name": "Người Xem 1", "deviceId": "uuid-..." }
  ],
  "spectatorCount": 3,
  "chat": [
    {
      "id": "uuid-...",
      "name": "Rồng Đỏ",
      "isPlayer": true,
      "message": "Hay quá!",
      "timestamp": "2026-05-23T10:06:00Z"
    }
  ],
  "mutedDeviceIds": ["uuid-muted"],
  "takebackRequest": {
    "fromColor": "red",
    "moveNumber": 12,
    "status": "pending",
    "requestedAt": "2026-05-23T10:07:00Z"
  },
  "takebacksUsed": { "red": 1, "black": 0 }
}
```

Client tính thời gian còn lại của lượt hiện tại: `timeRemaining[currentTurn] - (Date.now() - lastMoveAt)`.

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_MOVE` | 400 | Nước đi không hợp lệ theo luật |
| `WRONG_TURN` | 400 | Không phải lượt của người này |
| `STALE_MOVE_NUMBER` | 409 | Opponent đã đi trước (race condition) |
| `ROOM_NOT_FOUND` | 404 | Room ID không tồn tại |
| `ROOM_FULL` | 400 | Phòng đã có 2 người |
| `GAME_FINISHED` | 400 | Ván đã kết thúc |
| `NAME_TAKEN` | 409 | Tên đã được dùng (check soft, không hard-require unique) |
| `INVALID_NAME` | 400 | Tên không hợp lệ (< 2 hoặc > 16 ký tự) |
