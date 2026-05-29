# Home / Lobby Screen

**Route**: `/` (root)
**Purpose**: Landing page where players create/join rooms or browse open games

## Layout (Desktop — 1024px+)

```
+────────────────────────────────────────────────────────────────────+
|  [Logo] Cờ Tướng Online          [? Luật chơi]  [⚙]             |
+────────────────────────────────────────────────────────────────────+
|                                                                    |
|  +----------------+    +--------------------------------------+  |
|  |  TẠO PHÒNG MỚI |    |  Mã phòng: [________] [Tham gia]       |  |
|  |  [ Tạo phòng ] |    +--------------------------------------+  |
|  +----------------+                                               |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  |  Các phòng đang chờ                                          |  |
|  |  +----------------------------------------------------------+ |  |
|  |  | [Icon] Phòng của Minh              1/2  [Tham gia]    | |  |
|  |  +----------------------------------------------------------+ |  |
|  |  | [Icon] Chiến tranh cờ               1/2  [Theo dõi]   | |  |
|  |  +----------------------------------------------------------+ |  |
|  |  (+ empty state: "Chưa có phòng nào. Tạo phòng mới!")     |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  |  [Rules Modal — triggered by "?" button]                    |  |
|  +--------------------------------------------------------------+  |
+------------------------------------------------------------margin-+
```

## Layout (Mobile — 375px)

Single column, vertically stacked. Top: logo + rules button. Below: two action cards (Create Room + Join By Code). Bottom: room list (collapsible if many rooms).

```
+--------------------------------+
|  Cờ Tướng    [?]               |
+--------------------------------+
|  +----------------------------+ |
|  |  [ Tạo phòng mới ]         | |
|  +----------------------------+ |
|  +----------------------------+ |
|  |  [___________] [Tham gia]  | |
|  +----------------------------+ |
+--------------------------------+
|  Phòng đang chờ (2)            |
|  +----------------------------+ |
|  | Minh         1/2  [Tham gia]||
|  +----------------------------+ |
|  | Chiến        1/2  [Tham gia]||
|  +----------------------------+ |
+--------------------------------+
```

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Logo | "Cờ Tướng Online" text + decorative piece icon | Static |
| Create Room Card | Large primary card with "Tạo phòng mới" button | Click opens Create Room Modal |
| Room Code Input | Text input, max 6 chars, uppercase, monospace font | On enter / button → attempt join |
| Join Button | Secondary styled button | Validates code → joins or shows error |
| Rules Button | Ghost button with `?` icon | Opens Rules modal |
| Room List | Scrollable list of RoomCards | Shows only public open rooms |
| RoomCard (in list) | Card showing room name, host, player count, status | Click "Tham gia" → join |
| Toast | Notification popup for copy/join errors | Auto-dismiss after 3s |

## States

### Default (Landing with Open Rooms)
Normal state, rooms listed below.

### Loading
Spinner replaces room list while fetching public rooms (200ms debounce).

### Empty (No Open Rooms)
Shows illustration + "Chưa có phòng nào đang chờ. Hãy tạo phòng mới!" with arrow pointing to Create button.

### Error
If API fails: red banner "Không thể tải danh sách phòng. Thử lại." + Retry button.

### Creating Room (Modal Open)
Dimmed lobby behind Create Room Modal (focus trap active).

### Joining (In Progress)
Button shows spinner, input disabled, "Đang tham gia..." text.

### Join Error
Input border turns red, toast appears: "Mã phòng không hợp lệ hoặc phòng đã đầy."

## Key Interactions

### Create Room Flow
1. Click "Tạo phòng" → Create Room Modal opens
2. Enter room name (optional, defaults to "Phòng của [playerName]")
3. Toggle "Phòng riêng" if desired
4. Enter player name (required)
5. Click "Tạo phòng" → POST /api/rooms → on success redirect to /room/[code]
6. Show loading state on button during creation

### Join by Code Flow
1. User types 6-char code (auto-uppercase)
2. Click "Tham gia" or press Enter
3. POST /api/rooms/{code}/join
4. Success → redirect to /room/[code]
5. Error → show toast with error message

### Public Room List Flow
1. Lobby loads → GET /api/rooms → renders room list
2. Click "Tham gia" on a room → same join flow
3. If room fills between load and join → error toast

---

## Special: Create Room Modal

| Element | Description | Behavior |
|---------|-------------|----------|
| Backdrop | Semi-transparent dark overlay | Click → close modal |
| Modal Card | Centered, max-w-96 | Contains room setup form |
| Room Name Input | Text input, max 30 chars | Optional |
| Player Name Input | Text input, max 20 chars | Required |
| Private Toggle | Toggle switch | Marks room as private (hidden from list) |
| Create Button | Primary, full width | Submits form |
| Cancel Button | Ghost, text only | Closes modal |
| Field Errors | Red text below field | Shows on invalid submit |

---

## Mobile Considerations
- Both action areas (create + join) always visible above the fold (no scrolling to create)
- Room cards stack vertically
- Keyboard on mobile: submit on Enter after code input
- Avoid horizontal scroll — all elements 375px max
