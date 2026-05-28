# User Flow — Cờ Tướng Online

## High-Level Flow

```
[Landing / Lobby]
  │
  ├── [Tạo phòng mới]
  │     ├── Chọn Public / Private
  │     ├── (Tuỳ chọn) Nhập nickname
  │     └── → [Waiting Room] ─── chờ người vào
  │               │
  │               └── Guest vào ──→ [Game Screen - Playing]
  │
  ├── [Join phòng qua share link]
  │     └── /game/[roomId] ──────→ [Game Screen - Playing]
  │               (auto-join nếu còn chỗ, spectate nếu đầy)
  │
  └── [Browse phòng public]
        └── Click phòng ────────→ [Game Screen - Playing]


[Game Screen - Playing]
  │
  ├── Đến lượt mình → Click quân → Highlight nước đi hợp lệ → Click đích → Submit move
  │
  ├── Đến lượt địch → Polling 1.5s → Bàn cờ cập nhật
  │
  ├── [Đầu hàng] ─────────────→ [Game Result Modal]
  │
  ├── Chiếu bí → auto ─────────→ [Game Result Modal]
  │
  └── Đối thủ bỏ đi 30s ──────→ [Game Result Modal] (abandoned win)


[Game Result Modal]
  ├── [Chơi lại] ──────────────→ [Waiting Room] (new room, same players)
  └── [Về Lobby] ──────────────→ [Landing / Lobby]
```

---

## Screens Inventory

| Screen | Route | File |
|--------|-------|------|
| Lobby | `/` | `screens/home.md` |
| Game | `/game/[roomId]` | `screens/game.md` |
| Game Result | modal trong `/game/[roomId]` | `screens/result.md` |

---

## Key User Paths

### Path A: Chơi một mình (tìm đối thủ ngẫu nhiên)
```
Lobby → Tạo phòng Public → Waiting Room → [Ai đó join] → Playing
```

### Path B: Rủ bạn bè chơi
```
Lobby → Tạo phòng Private → Copy share link → Gửi cho bạn
Bạn click link → /game/[roomId] → Auto-join → Playing
```

### Path C: Join phòng đang chờ
```
Lobby → Thấy phòng public trong danh sách → Click "Vào chơi" → Playing
```

### Path D: Xem lại ván (Phase 2)
```
Lobby → "Lịch sử của tôi" → Chọn ván → Replay mode
```

---

## State Transitions (Game Screen)

```
waiting ──── guest joins ────→ playing
playing ──── checkmate ──────→ finished (winner by checkmate)
playing ──── resign ─────────→ finished (winner by resign)
playing ──── abandoned 30s ──→ finished (winner by abandoned)
finished ─── rematch ────────→ new room (waiting)
```

---

## Mobile vs Desktop Flow Differences

| Action | Desktop | Mobile |
|--------|---------|--------|
| Select piece | Click | Tap |
| See valid moves | Hover highlight (optional) + click | Tap piece first |
| Move piece | Click destination | Tap destination |
| Copy share link | Click button | Click button (opens share sheet nếu có) |
| View move history | Side panel luôn visible | Collapsible bottom drawer |
