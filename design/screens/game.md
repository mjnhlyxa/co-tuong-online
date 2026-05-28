# Screen: Game

**Route**: `/game/[roomId]`
**Purpose**: Màn hình chính — toàn bộ gameplay diễn ra ở đây.

---

## Layout — Desktop (≥1024px) — 3-column

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER                                                               │
│  ← Về lobby    🀄 Cờ Tướng Online             [🔗 Chia sẻ link]       │
├─────────────────┬───────────────────────────┬────────────────────────┤
│                 │                           │                        │
│  LEFT PANEL     │     BOARD                 │   RIGHT PANEL          │
│  (200px)        │     (480px)               │   (240px)              │
│                 │                           │                        │
│  ┌───────────┐  │   ┌─────────────────────┐ │  ┌──────────────────┐  │
│  │ PLAYER 2  │  │   │ · · · · · · · · ·   │ │  │ LỊCH SỬ NƯỚC ĐI │  │
│  │ (Đen)     │  │   │                     │ │  │                  │  │
│  │ Mây Đen   │  │   │ · · · · ⚫ · · · ·  │ │  │ 1. Xe đỏ 1→5    │  │
│  │ 🥈 1,285  │  │   │                     │ │  │ 2. Xe đen 1→5   │  │
│  │ ⏳ 19:45  │  │   │ ─ ─ SÔNG ─ ─ ─ ─ ─ │ │  │ 3. Mã đỏ 2→3    │  │
│  │ địch đi   │  │   │                     │ │  │ 4. Pháo đen 2→5 │  │
│  └───────────┘  │   │ · · · ● · · · · ·   │ │  │ ...              │  │
│                 │   │                     │ │  │                  │  │
│  ┌───────────┐  │   │ · · · · · · · · ·   │ │  └──────────────────┘  │
│  │ PLAYER 1  │  │   └─────────────────────┘ │                        │
│  │ (Đỏ)      │  │                           │  ┌──────────────────┐  │
│  │ Rồng Đỏ   │  │   STATUS BAR              │  │ [⚑ Đầu hàng]     │  │
│  │ 🥇 1,542  │  │   "Đến lượt bạn đi"       │  └──────────────────┘  │
│  │ ✅ 18:32  │  │                           │                        │
│  │ lượt bạn  │  │                           │                        │
│  └───────────┘  │                           │                        │
│                 │                           │                        │
├─────────────────┴───────────────────────────┴────────────────────────┤
```

**Bàn cờ — Cấu trúc SVG**:
- Quân cờ đặt trên **điểm giao nhau** của các đường kẻ (không phải ở giữa ô như cờ vua)
- Bàn cờ 9 cột × 10 hàng → 9×10 = 90 điểm giao nhau
- Đường ngang: 10 đường (hàng 0-9), toàn bộ chiều rộng
- Đường dọc bên ngoài (cột 0, 8): toàn bộ chiều cao
- Đường dọc bên trong (cột 1-7): bị cắt đôi tại sông — dừng ở hàng 4 (trên) và bắt đầu ở hàng 5 (dưới)
- **Sông**: khoảng trống giữa hàng 4 và 5, với text "楚河" và "漢界"
- **Cung vua** (palace): hàng 0-2 cột 3-5 (đen) và hàng 7-9 cột 3-5 (đỏ) — có đường chéo X
- **Điểm đánh dấu** (cross-hair): tại vị trí đặt quân Pháo (hàng 2,7 cột 1,7) và quân Tốt (hàng 3,6 cột 0,2,4,6,8)

---

## Layout — Desktop với Chat + Spectator Panel

Khi có chat/spectators: right panel chia thành 2 tabs — "Nước đi" và "Chat".

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER                                                               │
│  ← Về lobby    🀄 Cờ Tướng Online   👁 3 người xem   [🔗 Chia sẻ]    │
├─────────────────┬───────────────────────────┬────────────────────────┤
│  LEFT PANEL     │     BOARD                 │   RIGHT PANEL          │
│  (200px)        │                           │   (240px)              │
│                 │                           │                        │
│  [Player panels]│   [Board SVG]             │  ┌─ Nước đi ─┬─ Chat ─┐│
│  + timers       │                           │  │           │        ││
│                 │   STATUS BAR              │  │ move list │ chat   ││
│  ┌───────────┐  │                           │  │           │ msgs   ││
│  │ [↩ Hoãn]  │  │                           │  │           │        ││
│  │ [⚑ Đầu]  │  │                           │  └───────────┴────────┘│
│  └───────────┘  │                           │                        │
│                 │                           │  ┌──────────────────┐  │
│  Người xem:     │                           │  │ Nhắn tin...  [→] │  │
│  👁 Viewer1     │                           │  └──────────────────┘  │
│  👁 Viewer2     │                           │                        │
└─────────────────┴───────────────────────────┴────────────────────────┘
```

---

## Layout — Mobile (<640px) — Full featured

Mobile hiển thị đầy đủ tính năng. Tính năng quan trọng hiển thị trực tiếp; tính năng phụ mở qua modal/drawer từ bottom action bar.

```
┌────────────────────────────────┐
│ HEADER                         │
│ ← Về lobby      [🔗]  [VI ▾]  │
├────────────────────────────────┤
│                                │
│ OPPONENT PANEL (compact)       │
│ ⚫ Mây Đen  🥈 1,285  ⏱18:42  │
│             ⏳ Đang đi...      │
├────────────────────────────────┤
│                                │
│  BOARD (full width, ~343px)    │
│  ┌──────────────────────────┐  │
│  │  ·  ·  ·  ·  ·  ·  ·   │  │
│  │  (bàn cờ SVG)            │  │
│  │      SÔNG                │  │
│  │  ·  ·  ●  ·  ·  ·  ·   │  │  ← dot = valid move
│  └──────────────────────────┘  │
│                                │
│ MY PANEL (compact)             │
│ 🔴 Rồng Đỏ  🥇 1,542  ⏱19:03 │
│             ✅ Lượt của bạn    │
│                                │
├────────────────────────────────┤
│  BOTTOM ACTION BAR             │
│ [📜 4 nước] [💬 12] [👁 3] [⋯]│
└────────────────────────────────┘
```

**Bottom Action Bar icons:**
- 📜 `N nước` → mở Move History drawer
- 💬 `N` → mở Chat drawer (số = tin nhắn chưa đọc nếu có)
- 👁 `N` → mở Spectator list modal
- ⋯ More → mở Actions menu: [↩ Xin hoãn nước] [⚑ Đầu hàng] [🔗 Chia sẻ link]

**Drawers (bottom sheet, slide-up):**

Move History drawer:
```
┌────────────────────────────────┐
│ [▼] Lịch sử nước đi (4 nước)  │
├────────────────────────────────┤
│ 1. Xe đỏ 1→5    Xe đen 1→5   │
│ 2. Mã đỏ 2→3    ...           │
└────────────────────────────────┘
```

Chat drawer:
```
┌────────────────────────────────┐
│ [▼] Chat (12 tin nhắn)         │
├────────────────────────────────┤
│ Rồng Đỏ: Chơi tốt!            │
│ 👁 Viewer1: Ván hay quá!      │
│ Mây Đen: Cảm ơn               │
├────────────────────────────────┤
│ [Nhắn tin...            ] [→]  │
└────────────────────────────────┘
```

---

## Board Interaction

### State: Waiting for Opponent

```
┌─────────────────────────┐
│     Đang chờ đối thủ   │
│         vào phòng       │
│                         │
│  ┌───────────────────┐  │
│  │ Link phòng của bạn│  │
│  │ cotxuong.online/  │  │
│  │ game/a1b2c3...    │  │
│  │   [📋 Sao chép]   │  │
│  └───────────────────┘  │
│                         │
│  [Spinner] Đang chờ...  │
└─────────────────────────┘
```
Board render nhưng bị blur/overlay cho đến khi có 2 người.

### State: Playing — Idle (không phải lượt mình)

- Bàn cờ hiển thị đầy đủ, không interactive
- Overlay mờ nhẹ trên quân đỏ (để biết không phải lượt)
- Status bar: "Đến lượt đối thủ..."
- Polling 1.5s — khi có update, bàn cờ refresh instantly

### State: Playing — My Turn

- Quân của mình có cursor: pointer
- Click quân của mình:
  - Quân được chọn: viền xanh sáng + shadow `piece-selected`
  - Tất cả ô đi được: dot indicator (circle nhỏ `Board ValidMove`)
  - Ô có quân địch có thể ăn: highlight đỏ nhẹ
- Click ô đích → submit move → instant optimistic update → confirm từ server

### State: Check (Chiếu tướng)

- Tướng bị chiếu: glow đỏ `Board Check` + pulse animation nhẹ
- Status bar: "⚠️ Tướng đỏ đang bị chiếu!"
- Toast notification nhỏ 2s

### State: Last Move Highlight

- Ô xuất phát và ô đích của nước đi cuối: highlight vàng `Board LastMove`
- Giúp đối thủ nhận ra ngay quân vừa di chuyển

---

## Elements

### Header
| Element | Behavior |
|---------|---------|
| ← Về lobby | Confirm modal nếu game đang playing: "Bạn sẽ bỏ cuộc nếu rời đi. Tiếp tục?" |
| Share link button | Copy URL `/game/[roomId]` vào clipboard + toast "Đã sao chép!" |

### Player Panel (mỗi người 1 panel)
| Element | Description |
|---------|-------------|
| Color indicator | 🔴 (đỏ) hoặc ⚫ (đen) — circle |
| Nickname | Tên người chơi, max 16 chars |
| Rank badge | Tier icon + ELO number (e.g., "🥇 1,542") |
| Timer | Thời gian còn lại — hiển thị MM:SS. Trạng thái: `active` (đang đếm, màu bình thường), `paused` (lượt kia, mờ), `low` (< 60s, màu vàng), `critical` (< 30s, màu đỏ + pulse). Ẩn nếu `timeControl = null`. |
| Turn indicator | ✅ "Lượt của bạn" (nếu là mình) hoặc ⏳ "Đang chờ" |
| "Bạn" label | Label nhỏ bên dưới tên nếu đây là panel của mình |

**Timer behavior**: Client tự tính giây còn lại: `timeRemaining[color] - (Date.now() - lastMoveAt)` nếu đang là lượt của màu đó; bằng `timeRemaining[color]` nếu lượt kia. Khi về 0, POST resign tự động + hiển thị kết quả "Hết giờ".

Player đối thủ ở trên (phía quân đen), người chơi của mình ở dưới (phía quân đỏ/mình đứng).

### Status Bar
Một dòng dưới board (desktop) hoặc trên board (mobile):
- Waiting: "Đang chờ đối thủ vào phòng..."
- Playing, my turn: "✅ Đến lượt bạn đi"
- Playing, opponent turn: "⏳ Đến lượt đối thủ..."
- Check: "⚠️ [Màu] đang bị chiếu!"

### Move History Panel
```
┌─────────────────────┐
│ Lịch sử nước đi     │
├──────┬──────────────┤
│ 1.   │ Xe đỏ 9→8   │
│      │ Xe đen 1→2  │
├──────┬──────────────┤
│ 2.   │ Mã đỏ 8→7   │
│      │ Pháo đen... │
├──────┬──────────────┤
│ ...  │ ...          │
└──────┴──────────────┘
```
- Nước đi gần nhất ở cuối (scroll to bottom)
- Font mono, compact
- Nước đi cuối được highlight (bold)
- Mobile: collapsible accordion, show count khi đóng

### Resign Button
- Ghost button với icon cờ trắng: "⚑ Đầu hàng"
- Click → Confirm modal: "Bạn chắc chắn muốn đầu hàng?" [Huỷ] [Đầu hàng]
- Không làm nổi bật — đặt ở cuối panel để không bấm nhầm

### Take-back Button (↩ Xin hoãn nước)
- Hiển thị khi `allowTakeback=true` và người chơi đã có ít nhất 1 nước, không phải lượt của mình (tức vừa đi xong)
- Disabled nếu `takebacksUsed[myColor] >= 3` hoặc đang có pending request
- Click → POST `/takeback-request`
- Sau khi gửi: button đổi thành "Đang chờ đối thủ..." (disabled)
- Hiển thị số lần còn lại: "(còn 2/3)"

### Take-back Notification (cho đối thủ)
Khi polling trả về `takebackRequest.status === "pending"` và là lượt của mình:
```
┌───────────────────────────────────┐
│ ↩ Rồng Đỏ xin hoãn nước vừa đi   │
│                                   │
│ [Từ chối]          [Đồng ý]       │
└───────────────────────────────────┘
```
- Modal/banner xuất hiện ở trên board
- Auto-reject sau 30s nếu không phản hồi

### Spectator Count & List
- Header hiển thị "👁 N người xem" nếu `spectatorCount > 0`
- Click → modal/panel danh sách: tên từng spectator
- Desktop: hiển thị trong left panel phía dưới player panels
- Mobile: mở qua bottom bar icon 👁

### Chat Panel
- Desktop: tab "Chat" trong right panel (bên cạnh tab "Nước đi")
- Mobile: drawer từ bottom action bar 💬 icon
- Messages: tên + nội dung. Spectator có icon 👁 trước tên
- Input: text field + send button, maxLength 200
- Host: long-press hoặc right-click tên user → "Mute" option
- Muted user: thấy badge "(đã bị mute)" ở input, không gửi được

### Valid Move Highlights
Khi click chọn quân của mình:
- Ô trống hợp lệ: dot nhỏ ở tâm (circle 8px, màu xanh `--acc/50`)
- Quân địch có thể ăn: viền đỏ nhẹ xung quanh piece
- Quân đang chọn: viền xanh sáng `piece-selected`
- Click ô highlight → di chuyển

---

## States Summary

| State | Board | Status | Actions available |
|-------|-------|--------|------------------|
| Waiting | Blurred + overlay | "Chờ đối thủ..." | Copy link |
| My turn | Interactive | "Lượt của bạn" | Click pieces, resign |
| Opponent turn | View only | "Lượt đối thủ" | Resign |
| In check | Highlight king | "Đang bị chiếu!" | Must move to escape |
| Game over | Frozen | — | See Result Modal |
| Disconnected | Frozen + banner | "Mất kết nối..." | Auto-reconnect |

---

## Mobile-Specific Notes

- **Tap to select, tap to move**: `onPointerDown` trên từng ô
- **Board size**: Tự động fit `min(window.innerWidth - 32px, 320px)`
- **Move history**: Collapsible drawer, tap to expand/collapse
- **Resign**: Full-width button ở cuối trang
- **Share link**: Opens native share sheet nếu `navigator.share` available, fallback copy to clipboard
- **Waiting overlay**: Full-screen với share link prominent
