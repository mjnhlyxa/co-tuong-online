# Screen: Game Result

**Route**: Modal overlay trên `/game/[roomId]`
**Purpose**: Thông báo kết thúc ván, cho phép chơi lại hoặc về lobby.

---

## Layout — Desktop & Mobile (centered modal)

```
┌─────────────────────────────────────────┐
│                                         │
│          KẾT QUẢ VÁN ĐẤU               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │  🏆   RỒNG ĐỎ THẮNG!           │    │
│  │       (hoặc "BẠN THUA!")        │    │
│  │                                 │    │
│  │  Chiếu bí sau 24 nước           │    │
│  │  (hoặc Đối thủ đầu hàng /       │    │
│  │   Đối thủ rời bàn)              │    │
│  │                                 │    │
│  ├─────────────────────────────────┤    │
│  │                                 │    │
│  │  Thống kê ván đấu               │    │
│  │  🔴 Rồng Đỏ    ↔   Mây Đen ⚫  │    │
│  │  24 nước           23 nước      │    │
│  │  12:34 phút                     │    │
│  │                                 │    │
│  ├─────────────────────────────────┤    │
│  │                                 │    │
│  │  [🔄 Chơi lại]  [🏠 Về lobby]  │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Result Variants

### Variant A: Người chơi thắng (WIN)

```
🏆  BẠN THẮNG!
[Confetti animation — subtle, 2s]
Chiếu bí sau 24 nước
```
- Màu accent vàng/gold cho heading
- Icon 🏆
- Confetti nhẹ

### Variant B: Người chơi thua (LOSE)

```
😞  BẠN THUA
Đối thủ chiếu bí sau 24 nước
(hoặc: Bạn đã đầu hàng)
```
- Màu muted, không dramatic
- Không punish người thua — tông neutral

### Variant C: Đối thủ bỏ đi (ABANDONED WIN)

```
🏆  BẠN THẮNG!
Đối thủ đã rời bàn
```

### Variant D: Bạn đầu hàng (RESIGNED)

```
😞  BẠN THUA
Bạn đã đầu hàng
```

---

## Elements

| Element | Description |
|---------|-------------|
| Result heading | "BẠN THẮNG!" / "BẠN THUA" / "HÒA" — lớn, bold |
| End reason | "Chiếu bí sau X nước" / "Đối thủ đầu hàng" / "Đối thủ rời bàn" / "Hết giờ" |
| ELO change | "+18 ELO → 1,542" (màu xanh khi thắng) hoặc "-16 ELO → 1,508" (màu đỏ khi thua) — hiện bên dưới end reason |
| Stats row | Tên 2 người + số nước đi mỗi bên + thời gian ván |
| Chơi lại | Primary button — tạo phòng mới với cùng 2 người (host mới, guest cũ được invite tự động qua polling) |
| Về lobby | Secondary button |

---

## "Chơi Lại" Flow

Khi click "Chơi lại":
1. Server tạo phòng mới (private, host = winner hoặc host cũ)
2. Cả 2 người được redirect đến `/game/[new-roomId]`
3. → Waiting Room state, cả 2 vào ngay

Kỹ thuật: sau khi game `finished`, polling tiếp tục check `rematchRoomId` trong game document. Khi host click "Chơi lại", server set `rematchRoomId`. Guest polling thấy → auto-redirect.

---

## States

| State | Description |
|-------|-------------|
| Loading | "Đang lưu kết quả..." spinner (500ms max) |
| Win | Gold heading + confetti |
| Loss | Muted heading, no animation |
| Draw | Neutral, "HÒA" heading |
| Waiting for rematch | Sau khi click "Chơi lại": "Đang chờ đối thủ..." |

---

## Mobile Considerations

- Modal full-width với padding 16px trên mobile
- Buttons stack vertically, full-width
- Stats row: 2 columns side by side (đủ chỗ tại 375px)
- Heading text: 28px max trên mobile (không overflow)
