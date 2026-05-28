# Screen: Lobby / Home

**Route**: `/`
**Purpose**: First impression + nơi bắt đầu mọi game — tìm phòng, tạo phòng, hoặc join qua link.

---

## First Visit Flow

Khi user mở trang lần đầu (localStorage chưa có `co-tuong-deviceId`):
1. Generate UUID v4, lưu localStorage
2. Gọi `GET /api/players/[deviceId]` → `{ "exists": false }`
3. Hiển thị **FirstVisitModal** (bắt buộc, không đóng được) cho đến khi user nhập tên và chọn ngôn ngữ

Sau khi submit: `POST /api/players` → lưu profile → hiển thị lobby bình thường.

---

## Layout — Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  🀄 Cờ Tướng Online     🥇 Rồng Đỏ (1542)   [3W-1L]   [VI ▾]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HERO                                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Chơi cờ tướng online                                   │    │
│  │  Không cần đăng ký — chia sẻ link là vào ngay           │    │
│  │                                                         │    │
│  │  [+ Tạo phòng mới]    [🔗 Nhập link phòng]              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  LOBBY                                                           │
│  Phòng đang chờ người chơi (n phòng)                            │
│  Filter: [Tất cả] [Bronze] [Silver] [Gold] [Platinum] [Diamond] │
│                                                                  │
│  ┌────────────────────────────┐  ┌────────────────────────────┐ │
│  │ 🔴 Rồng Đỏ   🥇 1,542     │  │ 🔴 Kỳ Thủ Bắc  🥈 1,285   │ │
│  │ Public • ⏱ 20 phút         │  │ Public • ⏱ Không giới hạn  │ │
│  │ Chờ 2 phút    [Vào chơi ➜] │  │ Chờ 30 giây   [Vào chơi ➜]│ │
│  └────────────────────────────┘  └────────────────────────────┘ │
│  ┌────────────────────────────┐                                  │
│  │ 🔴 Long Vũ      👑 1,920   │  (empty state nếu không có      │
│  │ Public • ⏱ 10 phút         │   phòng: "Chưa có phòng nào"   │
│  │ Chờ 5 phút    [Vào chơi ➜] │   + nút Tạo phòng)              │
│  └────────────────────────────┘                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (<640px)

```
┌────────────────────────────────┐
│ HEADER                         │
│ 🀄 Cờ Tướng  🥇 1,542  [VI ▾] │
├────────────────────────────────┤
│                                │
│ Chơi cờ tướng online           │
│ Không cần đăng ký              │
│                                │
│ [+ Tạo phòng mới]    (full)    │
│ [🔗 Nhập link]       (full)    │
│                                │
├────────────────────────────────┤
│ Phòng đang chờ (n)             │
│ [Tất cả][🥉][🥈][🥇][💎][👑]  │
│                                │
│ ┌──────────────────────────┐   │
│ │ 🔴 Rồng Đỏ  🥇 1,542    │   │
│ │ Public • ⏱ 20 phút      │   │
│ │ 2 phút       [Vào chơi] │   │
│ └──────────────────────────┘   │
│                                │
│ ┌──────────────────────────┐   │
│ │ 🔴 Kỳ Thủ Bắc 🥈 1,285  │   │
│ │ Public • ⏱ Không giới hạn│   │
│ │ 30 giây      [Vào chơi] │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘
```

---

## Elements

### Header
| Element | Description |
|---------|-------------|
| Logo/icon | 🀄 + "Cờ Tướng Online" text — link về `/` |
| Player badge | Tier icon + tên + ELO: "🥇 Rồng Đỏ (1,542)" — click mở PlayerProfileModal để đổi tên |
| Session stats | Pill badge: "3W-1L". Chỉ hiện nếu đã chơi trong session. Data từ localStorage. |
| Language selector | Dropdown compact "[VI ▾]" — hiện flag/code của ngôn ngữ hiện tại, click mở dropdown 8 ngôn ngữ |

### Hero Section
| Element | Description |
|---------|-------------|
| Heading | H1: "Chơi cờ tướng online" |
| Tagline | "Không cần đăng ký — chia sẻ link là vào ngay" |
| CTA: Tạo phòng | Primary button, opens Create Room Modal |
| CTA: Nhập link | Ghost/secondary button, opens Join by Link input |

### Room Filter Bar
| Element | Description |
|---------|-------------|
| Rank chips | Pill buttons: [Tất cả] [🥉 Bronze] [🥈 Silver] [🥇 Gold] [💎 Platinum] [👑 Diamond] |
| Active state | Selected chip: filled background (`--acc` color), others: outlined |
| Filter behavior | Client-side filter nếu < 50 rooms; server-side query nếu nhiều hơn |

### Room List
| Element | Description |
|---------|-------------|
| Section title | "Phòng đang chờ người chơi" + count badge |
| Room cards | Grid 2 cols (desktop), 1 col (mobile) |
| Auto-refresh | Lobby re-fetches mỗi 5s (SWR, nhẹ hơn in-game polling) |
| Empty state | Illustration nhỏ + "Chưa có phòng nào đang chờ" + "Tạo phòng đầu tiên →" |

### Room Card (updated)
| Element | Description |
|---------|-------------|
| Player color dot | 🔴 đỏ (host luôn đỏ) |
| Nickname | Host name |
| Rank badge | Tier icon + ELO number (e.g., "🥇 1,542") |
| Time control tag | "⏱ 20 phút" hoặc "⏱ Không giới hạn" |
| Wait time | "Chờ X phút" (relative to createdAt) |
| Action button | "Vào chơi →" — primary |

---

## Modals

### Modal: First Visit (Bắt buộc — không đóng được)

```
┌─────────────────────────────────┐
│  🀄 Chào mừng!                  │
├─────────────────────────────────┤
│                                 │
│  Chọn ngôn ngữ / Language       │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐           │
│  │VI│ │EN│ │中│ │한│           │
│  └──┘ └──┘ └──┘ └──┘           │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐           │
│  │RU│ │FR│ │DE│ │PT│           │
│  └──┘ └──┘ └──┘ └──┘           │
│                                 │
│  Tên của bạn *                  │
│  ┌─────────────────────────┐    │
│  │ Nhập tên (2-16 ký tự)   │    │
│  └─────────────────────────┘    │
│  Tên hiển thị khi chơi online   │
│                                 │
│         [Bắt đầu chơi ➜]        │
└─────────────────────────────────┘
```

- Ngôn ngữ: 8 button grid, active = filled; default preselect từ `navigator.language`
- Tên: required, 2-16 ký tự, validate live
- "Bắt đầu chơi" disabled cho đến khi tên hợp lệ

### Modal: Tạo Phòng Mới

```
┌─────────────────────────────────┐
│  Tạo phòng mới              [×] │
├─────────────────────────────────┤
│                                 │
│  Loại phòng                     │
│  ● 🌐 Công khai                 │
│    Xuất hiện trong danh sách    │
│  ○ 🔒 Riêng tư                  │
│    Chỉ vào được qua link        │
│                                 │
│  Thời gian mỗi bên              │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ 10p  │ │ 20p  │ │ 30p  │    │
│  └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ 40p  │ │ 50p  │ │  1h  │    │
│  └──────┘ └──────┘ └──────┘    │
│  ┌─────────────────────────┐    │
│  │ ∞  Không giới hạn       │    │
│  └─────────────────────────┘    │
│                                 │
│  Tuỳ chọn nâng cao              │
│  👁 Cho phép người xem  [ON ●]  │
│    Người ngoài có thể theo dõi  │
│  ↩ Cho phép hoãn nước   [ON ●]  │
│    Mỗi bên hoãn tối đa 3 lần    │
│                                 │
│  [Huỷ]        [Tạo phòng ➜]     │
└─────────────────────────────────┘
```

- Thời gian: 7 options (10/20/30/40/50 phút, 1 giờ, Không giới hạn); default: 20 phút
- Cho phép người xem: toggle ON/OFF; default ON
- Cho phép hoãn nước: toggle ON/OFF; default ON; mỗi bên tối đa 3 lần/ván

### Modal: Nhập Link Phòng

```
┌─────────────────────────────────┐
│  Vào phòng bằng link        [×] │
├─────────────────────────────────┤
│                                 │
│  Dán link hoặc mã phòng         │
│  ┌─────────────────────────┐    │
│  │ https://... hoặc roomId │    │
│  └─────────────────────────┘    │
│                                 │
│  [Huỷ]              [Vào chơi ➜]│
└─────────────────────────────────┘
```

### Modal: Player Profile (click vào tên trong header)

```
┌─────────────────────────────────┐
│  Hồ sơ của bạn              [×] │
├─────────────────────────────────┤
│  🥇 ELO: 1,542                  │
│  Peak: 1,580                    │
│                                 │
│  Thắng  Thua  Hoà   Tổng        │
│  12     8     2     22          │
│                                 │
│  Tên hiển thị                   │
│  ┌─────────────────────────┐    │
│  │ Rồng Đỏ            [✎]  │    │
│  └─────────────────────────┘    │
│                                 │
│              [Đóng]             │
└─────────────────────────────────┘
```

---

## States

| State | Description |
|-------|-------------|
| First visit | FirstVisitModal fullscreen, lobby blurred behind |
| Loading | Skeleton cards (3 placeholder cards) khi fetch rooms |
| No rooms | Empty state với illustration + CTA |
| Has rooms | Grid of RoomCards, auto-refresh mỗi 5s |
| Filtered | Chỉ hiện rooms của tier đang selected |
| Error | "Không thể tải danh sách phòng" + Retry button |

---

## Mobile Considerations

- Header compact: logo + tier+ELO pill + language selector trong 1 hàng
- Hero buttons: full-width, stacked vertically, min-height 48px
- Rank filter: horizontally scrollable chip row (no wrap)
- Room cards: single column, full width
- FirstVisitModal: full-screen on mobile
- Other modals: bottom sheet on mobile
