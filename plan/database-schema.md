# Database Schema — Cờ Tướng Online

## Collection: `players`

Profile người chơi theo device — persistent identity không cần account.

```typescript
{
  _id: ObjectId,
  deviceId: string,       // UUID v4 — permanent, stored in localStorage as "co-tuong-deviceId"
  name: string,           // Display name, required, 2-16 chars
  
  stats: {
    wins: number,         // default 0
    losses: number,
    draws: number,
    abandonedWins: number,
    abandonedLosses: number,
    totalGames: number,
  },
  
  ranking: {
    elo: number,          // default 1500
    tier: "bronze" | "silver" | "gold" | "platinum" | "diamond",
    // bronze <1200 | silver 1200-1400 | gold 1400-1600 | platinum 1600-1900 | diamond 1900+
    peakElo: number,
  },
  
  preferences: {
    language: "vi" | "en" | "zh" | "ko" | "ru" | "fr" | "de" | "pt",  // default "vi"
  },
  
  createdAt: Date,
  lastSeenAt: Date,
}
```

**Indexes**:
- `deviceId` (unique) — primary lookup
- `ranking.elo` (desc) — leaderboard queries
- `lastSeenAt` — active player queries

**ELO Calculation**:
```
K = 32 (< 20 games), 16 (≥ 20 games)
E = 1 / (1 + 10^((opponent_elo - player_elo) / 400))  // expected score
new_elo = old_elo + K * (S - E)  // S: 1=win, 0.5=draw, 0=loss
// Abandoned wins/losses count as normal win/loss
```

---

## Collection: `rooms`

Quản lý phòng chờ và trạng thái ghép cặp.

```typescript
{
  _id: ObjectId,
  roomId: string,          // UUID v4 — dùng trong URL: /game/[roomId]
  type: "public" | "private",
  status: "waiting" | "playing" | "finished",

  host: {
    deviceId: string,
    name: string,
    elo: number,
    tier: string,
    color: "red"           // Host luôn chơi đỏ (đi trước)
  },
  guest: {
    deviceId: string | null,
    name: string | null,
    elo: number | null,
    tier: string | null,
    color: "black" | null
  },
  
  timeControl: number | null,  // minutes per player (10/20/30/40/50/60), null = no limit
  allowSpectators: boolean,     // default true
  allowTakeback: boolean,       // default true

  createdAt: Date,
  startedAt: Date | null,
  finishedAt: Date | null
}
```

**Indexes**:
- `roomId` (unique) — lookup by room ID
- `status + type` (compound) — query phòng public đang waiting: `{ status: "waiting", type: "public" }`
- `createdAt` (TTL: 24 giờ) — tự xoá phòng cũ

**Example document**:
```json
{
  "_id": "...",
  "roomId": "a1b2c3d4-...",
  "type": "public",
  "status": "waiting",
  "host": { "playerId": "uuid-host", "name": "Rồng Đỏ", "color": "red" },
  "guest": { "playerId": null, "name": null, "color": null },
  "createdAt": "2026-05-23T10:00:00Z",
  "startedAt": null,
  "finishedAt": null
}
```

---

## Collection: `games`

Lưu toàn bộ trạng thái và lịch sử ván đấu.

```typescript
{
  _id: ObjectId,
  roomId: string,          // FK → rooms.roomId

  redPlayer: {
    deviceId: string,
    name: string,
    eloAtStart: number,
  },
  blackPlayer: {
    deviceId: string,
    name: string,
    eloAtStart: number,
  },

  // Trạng thái hiện tại
  status: "playing" | "finished",
  currentTurn: "red" | "black",
  currentMoveNumber: number,  // Dùng cho optimistic locking

  // Board state — mảng 10 hàng × 9 cột
  // null = ô trống, string = mã quân: "r-ju" (red Xe), "b-ma" (black Mã),...
  boardState: (string | null)[][],

  // Lịch sử nước đi
  moves: [
    {
      moveNumber: number,
      playerId: string,
      color: "red" | "black",
      from: { row: number, col: number },
      to: { row: number, col: number },
      piece: string,             // Loại quân đã đi
      captured: string | null,   // Quân bị ăn (nếu có)
      notation: string,          // Human-readable: "Xe đỏ 1-5"
      timestamp: Date,
      isCheck: boolean,          // Nước đi này chiếu tướng?
    }
  ],

  // Heartbeat — để detect disconnection
  lastSeen: {
    red: Date,
    black: Date
  },

  // Time control
  timeControl: number | null,          // minutes per player (null = no limit)
  timeRemaining: {
    red: number,                        // milliseconds remaining
    black: number,
  },
  lastMoveAt: Date | null,             // when current turn started (subtract from now to get elapsed)

  // Room settings (copied from room at game start)
  allowSpectators: boolean,
  allowTakeback: boolean,

  // Spectators
  spectators: [
    {
      deviceId: string,
      name: string,
      joinedAt: Date,
    }
  ],
  mutedDeviceIds: string[],            // deviceIds bị chủ phòng mute chat

  // Chat
  chat: [
    {
      id: string,                      // UUID v4
      deviceId: string,
      name: string,
      isPlayer: boolean,               // false = spectator
      message: string,                 // max 200 ký tự
      timestamp: Date,
    }
  ],                                   // giữ tối đa 100 messages gần nhất

  // Take-back request
  takebackRequest: {
    fromColor: "red" | "black",
    moveNumber: number,                // nước muốn hoãn (nước vừa đi)
    status: "pending" | "accepted" | "rejected",
    requestedAt: Date,
  } | null,
  takebacksUsed: {                     // số lần hoãn đã dùng
    red: number,
    black: number,
  },

  // Kết quả
  winner: "red" | "black" | "draw" | null,
  endReason: "checkmate" | "resign" | "draw_agreement" | "abandoned" | "timeout" | null,

  startedAt: Date,
  finishedAt: Date | null
}
```

**Piece codes**:
```
r-ju  = Đỏ Xe        b-ju  = Đen Xe
r-ma  = Đỏ Mã        b-ma  = Đen Mã
r-xiang = Đỏ Tượng   b-xiang = Đen Tượng
r-shi = Đỏ Sĩ        b-shi = Đen Sĩ
r-jiang = Đỏ Tướng   b-jiang = Đen Tướng
r-pao = Đỏ Pháo      b-pao = Đen Pháo
r-zu  = Đỏ Tốt       b-zu  = Đen Tốt
```

**Indexes**:
- `roomId` (unique) — primary lookup
- `status + startedAt` — query ván đang chơi, sort theo thời gian
- `redPlayer.playerId` + `blackPlayer.playerId` — lịch sử ván của 1 người chơi

**Estimated document size**: ~12KB per game (100 nước + 100 chats + spectators)  
**Estimated storage**: 512MB Atlas free tier → ~40,000 ván đấu  
**Chat cap**: Giữ 100 messages gần nhất — $push với $slice để tự trim

---

## Initial Board State

```
Hàng 0 (black, trên): [b-ju, b-ma, b-xiang, b-shi, b-jiang, b-shi, b-xiang, b-ma, b-ju]
Hàng 1:               [null, null, null, null, null, null, null, null, null]
Hàng 2:               [null, b-pao, null, null, null, null, null, b-pao, null]
Hàng 3:               [b-zu, null, b-zu, null, b-zu, null, b-zu, null, b-zu]
Hàng 4:               [null, null, null, null, null, null, null, null, null]
--- SÔNG ---
Hàng 5:               [null, null, null, null, null, null, null, null, null]
Hàng 6:               [r-zu, null, r-zu, null, r-zu, null, r-zu, null, r-zu]
Hàng 7:               [null, r-pao, null, null, null, null, null, r-pao, null]
Hàng 8:               [null, null, null, null, null, null, null, null, null]
Hàng 9 (red, dưới):   [r-ju, r-ma, r-xiang, r-shi, r-jiang, r-shi, r-xiang, r-ma, r-ju]
```
