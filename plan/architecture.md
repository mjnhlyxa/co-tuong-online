# Architecture — Cờ Tướng Online

## Folder Structure

```
co-tuong-online/app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: font, metadata, global styles
│   │   ├── page.tsx                # Lobby — danh sách phòng + tạo phòng mới
│   │   ├── globals.css
│   │   ├── game/
│   │   │   └── [roomId]/
│   │   │       └── page.tsx        # Game screen — bàn cờ + move history
│   │   └── api/
│   │       ├── rooms/
│   │       │   ├── route.ts        # GET (list public rooms), POST (create room)
│   │       │   └── [roomId]/
│   │       │       └── route.ts    # GET (room detail + join)
│   │       └── games/
│   │           └── [roomId]/
│   │               ├── route.ts    # GET (game state)
│   │               └── move/
│   │                   └── route.ts  # POST (submit move)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── CopyButton.tsx      # Copy share link
│   │   └── game/
│   │       ├── Board.tsx           # Bàn cờ 9x10 với quân cờ
│   │       ├── Piece.tsx           # Một quân cờ (Tướng, Xe, Pháo, ...)
│   │       ├── MoveHistory.tsx     # Danh sách nước đi
│   │       ├── PlayerPanel.tsx     # Thông tin người chơi + lượt
│   │       ├── GameResult.tsx      # Modal kết quả + chơi lại
│   │       └── RoomCard.tsx        # Card phòng trong lobby
│   ├── lib/
│   │   ├── mongodb.ts              # DB singleton connection
│   │   ├── player.ts               # Anonymous player identity (localStorage)
│   │   └── xiangqi/                # Toàn bộ logic cờ tướng — pure TypeScript
│   │       ├── types.ts            # GameState, Piece, Move, Position types
│   │       ├── board.ts            # Initial board setup, board utilities
│   │       ├── rules.ts            # isValidMove() cho từng loại quân
│   │       ├── engine.ts           # applyMove(), checkCheck(), checkCheckmate()
│   │       └── notation.ts         # Move → human-readable string (e.g., "Xe 1-5")
│   ├── models/
│   │   ├── Room.ts                 # Mongoose schema: Room
│   │   └── Game.ts                 # Mongoose schema: Game
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces
├── .env.local                      # MONGODB_URI=mongodb://localhost:27017/co-tuong-online
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

## Routes & Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Lobby | Danh sách phòng công khai, tạo phòng mới |
| `/game/[roomId]` | Game | Bàn cờ, move history, player info |

## API Routes

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/rooms` | List phòng public đang `waiting` |
| POST | `/api/rooms` | Tạo phòng mới (public/private), trả về roomId |
| GET | `/api/rooms/[roomId]` | Chi tiết phòng, auto-join nếu là guest |
| GET | `/api/games/[roomId]` | Game state hiện tại (dùng cho SWR polling) |
| POST | `/api/games/[roomId]/move` | Submit nước đi — validate + lưu DB |

## Data Flow

### Tạo phòng và chơi

```
User → POST /api/rooms { type: "public", hostPlayerId, hostName }
     ← { roomId, shareLink }

User mở /game/[roomId]
  → GET /api/rooms/[roomId]  (check status, register as host)
  → SWR poll GET /api/games/[roomId] mỗi 1.5s

Bạn bè click share link → /game/[roomId]
  → GET /api/rooms/[roomId]  (auto-join as guest nếu slot trống)
  → Room status: waiting → playing
  → SWR bắt đầu poll cho cả hai
```

### Submit nước đi

```
User click quân → highlight ô hợp lệ (client-side: xiangqi/rules.ts)
User click ô đích → POST /api/games/[roomId]/move { from, to, playerId, moveNumber }
  Server: validate playerId = currentTurn
  Server: validate move via xiangqi/rules.ts (server-side re-validation)
  Server: atomic update với moveNumber để tránh race condition
  Server: check chiếu bí → update winner nếu có
  ← { success, newState }

SWR của opponent catch update tại poll tiếp theo (max 1.5s delay)
```

## Session / Player Identity

```typescript
// Không cần NextAuth — đơn giản và zero friction
// localStorage key: "co-tuong-playerId" (UUID v4)
// localStorage key: "co-tuong-playerName" (optional nickname)

// Server không cần session — playerId trong request body/cookie đủ
// Bảo mật: chỉ player đúng lượt mới được submit move (validate server-side)
```

## Race Condition Prevention

Dùng `moveNumber` (số thứ tự nước đi) như optimistic lock:
```
POST /api/games/[roomId]/move
body: { from, to, playerId, moveNumber: 15 }

Server:
  db.Game.findOneAndUpdate(
    { roomId, currentMoveNumber: 15, currentTurn: playerId },
    { $push: { moves: newMove }, $set: { currentMoveNumber: 16, currentTurn: opponent } },
    { new: true }
  )
  // Nếu moveNumber không khớp → reject (opponent đã đi trước)
```
