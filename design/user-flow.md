# co-tuong-online — User Flow

## Screen Map

```
[Home / Lobby]
  ├── [Create Room Modal] ──────→ [Room Waiting Screen]
  │                                       ↓ (share link / code)
  │                              [Opponent joins via link]
  │                                       ↓
  │                              [Game — Playing]
  │                                       ↓ (checkmate / timeout / resign)
  │                              [Game End Modal]
  │                                       ↓
  │                              [Lobby — Rematch? / Exit]
  │
  ├── [Join by Code Input] ─────→ [Room Waiting Screen]
  │                                       ↓
  │                              [Game — Playing]
  │
  └── [Browse Public Rooms] ─────→ [Room List]
                                       │ (join button)
                                       ↓
                                 [Room Waiting Screen]
```

## Screen Descriptions

### 1. Home / Lobby (`/`)

**What user sees:**
- App title and logo
- "Tạo phòng mới" (Create Room) button — primary action
- Code input + "Tham gia" (Join) button — secondary action
- "Các phòng đang chờ" (Open Rooms) list below
- Link to rules modal (`?` icon)

**Actions available:**
- Click "Tạo phòng" → opens Create Room modal
- Enter code + click "Tham gia" → attempt join → success → game
- Click room in public list → join room → game
- Click `?` → Rules modal opens

**Transitions:**
- Create Room →/Create Waiting Screen (room page)
- Join success → /room/[roomId]

---

### 2. Create Room Modal

**What user sees:**
- Room name input (with placeholder "Phòng của tôi")
- "Phòng riêng" (Private Room) toggle
- Player name input
- "Tạo phòng" (Create) + "Hủy" (Cancel) buttons

**Actions:**
- Fill name → click "Tạo" → room created → redirect to /room/[code]
- Cancel → modal closes, back to lobby

---

### 3. Room Waiting Screen (`/room/[roomId]`)

**What user sees:**
- Room name and 6-char code (highlighted, copyable)
- "Share Link" button
- "Đang chờ đối thủ..." spinner with pulse animation
- Both player panel slots (one filled with host, one empty)
- "Thoát" (Leave) button

**Actions:**
- Share link → copies URL to clipboard, shows toast "Đã sao chép!"
- Copy code → same
- Opponent joins via link → game auto-starts → redirect to /room/[roomId] (playing state)

**Transition:**
- Second player joins → 500ms animation → auto-redirect to playing state

---

### 4. Game Screen (`/room/[roomId]` — playing state)

**What user sees:**
- Player panel (top): opponent name, timer, connection status, isHost badge
- Game board centered: 10×9 grid, pieces in starting positions
- Player panel (bottom): your name, timer, connection status
- Move history (right side, desktop) / collapsible (mobile)
- Rules help `?` button (top-right of board)
- Board: your side at bottom of screen

**Actions:**
- Click own piece → piece highlights, valid move dots appear
- Click valid move dot → move submitted, shown in history
- Click elsewhere → deselect
- Timer reaches 0 → automatic loss

**States on this screen:**
- Waiting for opponent (should not reach this screen without opponent)
- My turn — board interactive
- Opponent's turn — board grayed slightly, non-interactive
- Check — your General highlighted red, pulsing warning
- Checkmate — Game End Modal appears

---

### 5. Game End Modal

**What user sees:**
- Large result text: "Chiến thắng!" (Win) / "Thua cuộc" (Loss) / "Hòa" (Draw)
- Reason text: "Ph将死" (Checkmate) / "Hết giờ" (Timeout) / "Đối thủ逃走" (Resign)
- Winner name highlighted
- "Đấu lại" (Rematch) button — primary
- "Thoát" (Exit to Lobby) button — secondary

**Actions:**
- Rematch → both players agree → new game created in same room → back to Game
- Exit → redirect to / (lobby)
- If opponent clicks Rematch first → pending state: "Chờ đối thủ xác nhận..."

---

### 6. Rules Modal

**What user sees:**
- Full-screen (mobile) / centered 600px modal (desktop)
- Close `X` button
- Title: "Luật Cờ Tướng"
- Each piece type with name + SVG diagram + description
- Scrollable if content overflows

---

### 7. Match History (Desktop Only, Post-MVP)

**What user sees:**
- List of past games: date, opponent, result, moves count
- Click to expand → shows move-by-move board animation

**Route**: `/match/` — accessible from lobby nav

---

## Mobile-Specific Flows

### Mobile: Join via Deep Link
- User receives `https://co-tuong-online.vercel.app/room/X7K2M1` from friend
- Opens link → lands on /room/X7K2M1 → if room waiting, sees waiting screen
- If game in progress → spectator mode

### Mobile: Game Interaction
- Tap piece → highlights (golden ring)
- Tap destination → move commits
- Tap elsewhere → deselects
- NO drag-and-drop on mobile (too imprecise)

---

## Error Flows

| Situation | What user sees |
|-----------|---------------|
| Join invalid code | Toast: "Mã phòng không hợp lệ" |
| Join full room | Toast: "Phòng đã đầy" |
| Opponent disconnects | Badge on panel "Đã ngắt kết nối", timer pauses |
| Reconnect during game | State restored automatically, toast "Đã kết nối lại" |
| Network lost | Overlay: "Mất kết nối. Đang kết nối lại..." with spinner |
