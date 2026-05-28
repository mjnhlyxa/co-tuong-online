# Components — Cờ Tướng Online

Danh sách tất cả reusable components. Đây là implementation checklist cho `game-implement`.

---

## UI Components (Generic)

### Button
```
Variants: "primary" | "secondary" | "ghost" | "danger"
Sizes:    "sm" | "md" | "lg"
Props:    children, onClick, disabled, loading, fullWidth, icon
States:   default, hover, active, disabled, loading (spinner)

primary:   bg-accent text-white hover:bg-accent-hover
secondary: bg-surface border border-border text-text-primary
ghost:     transparent border-transparent text-text-secondary hover:bg-surface-raised
danger:    bg-red-600/20 border border-red-600/40 text-red-400

Min height: 40px (md), 48px (lg — for mobile tap targets)
```

### Modal
```
Props:  isOpen, onClose, title, children, size ("sm"|"md"|"lg"|"fullscreen-mobile")
Behavior:
  - Desktop: centered, max-width by size, backdrop blur
  - Mobile (size=fullscreen-mobile): bottom sheet, slide-up animation
  - Close on backdrop click (ngoại trừ confirm modals)
  - Close on Escape key
  - Focus trap while open
```

### CopyButton
```
Props:  text (string to copy), label, successLabel
Behavior:
  - Click → copy text to clipboard
  - Label changes to successLabel for 2s, then reverts
  - Uses navigator.share() on mobile if available, fallback clipboard
  
Example: <CopyButton text={shareUrl} label="🔗 Chia sẻ" successLabel="✅ Đã sao chép!" />
```

### Badge
```
Variants: "public" | "private" | "waiting" | "playing" | "check" | "win" | "lose"
Size:     "sm" | "md"
Props:    variant, children

Styles (examples):
  waiting: bg-accent/20 text-accent border border-accent/30
  check:   bg-red-piece/20 text-red-piece border border-red-piece/30
  win:     bg-success/20 text-success
```

### Toast
```
Props:  message, type ("info"|"success"|"warning"|"error"), duration (default 2000ms)
Position: top-center (desktop), top-center (mobile)
Auto-dismiss after duration
Used for: "Đã sao chép link", "Chiếu tướng!", error messages
```

### Spinner
```
Sizes: "sm" (16px) | "md" (24px) | "lg" (40px)
Color: inherits from parent or accent default
```

---

## Game Components

### Board
```
Props:
  boardState: (string|null)[][]   — 10×9 grid
  selectedCell: Position | null   — ô đang được chọn
  validMoves: Position[]          — ô có thể đi tới
  lastMove: {from, to} | null    — nước đi cuối (highlight)
  checkedKing: Position | null   — tướng đang bị chiếu
  myColor: "red" | "black" | null — màu của người dùng hiện tại
  onCellClick: (pos: Position) => void
  disabled: boolean               — true khi không phải lượt mình

Rendering:
  - Vẽ bàn cờ SVG hoặc CSS grid 9×10
  - Đường kẻ dọc/ngang
  - Đường sông giữa hàng 4-5
  - Đường chéo trong cung (hàng 0-2 và 7-9, cột 3-5)
  - Overlay các highlights theo props
  - Render <Piece> component cho mỗi ô có quân

Sizing: Responsive — width = min(480px, 95vw - 32px)
```

### Piece
```
Props:
  code: string          — e.g., "r-ju", "b-jiang"
  isSelected: boolean
  isValidTarget: boolean — là ô đích hợp lệ?
  isCaptureable: boolean — quân địch có thể bị ăn?

Rendering:
  - Hình tròn với double-ring border
  - Màu nền theo color (red/black)
  - Chữ Hán ở giữa (font Noto Serif SC)
  - CSS transforms cho selected/hover states
  - Kích thước: `(boardWidth / 9) * 0.85` px diameter

States:
  default:     piece color + drop shadow
  selected:    glow xanh + scale(1.05)
  valid-target: dot nhỏ ở tâm ô (khi ô trống)
  captureable: highlight đỏ nhẹ quanh piece địch
  in-check:    pulse animation đỏ
```

### MoveHistory
```
Props:
  moves: MoveRecord[]
  currentMoveNumber: number

Rendering:
  Bảng 2 cột (nước đỏ | nước đen), theo từng lượt
  Move notation: "Xe đỏ 1→5", "Pháo đen 8→5", v.v.
  Latest move: bold
  Auto-scroll to bottom khi có nước mới
  
Mobile variant: collapsible — hiển thị "X nước đã đi" khi đóng
```

### PlayerPanel
```
Props:
  player: { name: string, color: "red"|"black", elo: number, tier: string }
  isMyPanel: boolean      — true nếu là người chơi hiện tại
  isCurrentTurn: boolean
  position: "top" | "bottom"  — opponent trên, mình dưới
  timeRemaining: number | null   — ms còn lại (null = no time control)
  isTimerActive: boolean         — true khi đang là lượt của player này

Rendering:
  - Color dot (🔴/⚫)
  - Tên player
  - PlayerRankBadge (tier icon + ELO)
  - Timer component (nếu timeRemaining != null)
  - Turn indicator: ✅ "Lượt của bạn" | ⏳ spinner
  - "Bạn" label nhỏ nếu isMyPanel=true
```

### StatusBar
```
Props:
  status: "waiting" | "playing" | "check" | "finished"
  currentTurn: "red" | "black"
  myColor: "red" | "black" | null
  checkColor: "red" | "black" | null

Rendering:
  waiting:  "Đang chờ đối thủ vào phòng..."
  my-turn:  "✅ Đến lượt bạn đi"
  opp-turn: "⏳ Đến lượt đối thủ..."
  check:    "⚠️ Tướng [màu] đang bị chiếu!"
```

### WaitingOverlay
```
Props:
  shareLink: string
  isVisible: boolean

Rendering:
  Semi-transparent overlay trên board
  "Đang chờ đối thủ vào phòng..."
  Share link + CopyButton
  Spinner
```

### GameResultModal
```
Props:
  isOpen: boolean
  winner: "red" | "black" | "draw"
  endReason: "checkmate" | "resign" | "draw_agreement" | "abandoned"
  myColor: "red" | "black"
  stats: { redMoves, blackMoves, durationSeconds }
  redName: string
  blackName: string
  onRematch: () => void
  onGoHome: () => void

Rendering:
  Heading: "BẠN THẮNG!" / "BẠN THUA" / "HÒA"
  End reason text
  Stats: tên 2 người, số nước, thời gian
  Buttons: [Chơi lại] [Về lobby]
  Win: subtle confetti (CSS-only, 2s)
```

### RoomCard
```
Props:
  room: { roomId, host: { name }, createdAt }
  onJoin: (roomId: string) => void

Rendering:
  - 🔴 + host name
  - "Public" badge
  - Time waiting (relative: "2 phút trước")
  - "Vào chơi →" button (primary)
```

### Timer
```
Props:
  milliseconds: number     — thời gian còn lại
  isActive: boolean        — true khi đang đếm ngược
  onExpire: () => void     — callback khi về 0

Rendering:
  - Hiển thị "MM:SS" format
  - isActive=true: đếm ngược mỗi giây (setInterval client-side)
  - isActive=false: hiển thị static, mờ hơn

States:
  normal:    text-primary, font-mono, font-medium
  active:    text-primary, animate nếu đang đếm
  low:       < 60s → text-yellow-400
  critical:  < 30s → text-red-400 + pulse animation
  expired:   "0:00" đỏ → trigger onExpire callback

Notes:
  Initial value từ server (timeRemaining), sau đó self-tick.
  Sync lại mỗi lần nhận polling update (tránh drift).
```

### LanguageSelector
```
Props:
  value: "vi"|"en"|"zh"|"ko"|"ru"|"fr"|"de"|"pt"
  onChange: (lang: string) => void
  compact: boolean  — compact=true hiện code 2 ký tự + arrow, false hiện tên đầy đủ

Rendering (compact=true):
  - "[VI ▾]" button
  - Dropdown khi click: 8 options với flag emoji + tên bản ngữ
    • 🇻🇳 Tiếng Việt
    • 🇺🇸 English
    • 🇨🇳 中文
    • 🇰🇷 한국어
    • 🇷🇺 Русский
    • 🇫🇷 Français
    • 🇩🇪 Deutsch
    • 🇵🇹 Português
  - Selected option: checkmark

Behavior:
  - onChange → update localStorage + call PUT /api/players/[deviceId] với { language }
  - Close on outside click / Escape
```

### FirstVisitModal
```
Props:
  onComplete: (name: string, language: string) => void

Rendering:
  - Không có nút đóng (bắt buộc hoàn thành)
  - Language grid: 8 button, 4×2, mỗi button hiện flag + code
    (auto-preselect từ navigator.language)
  - Name input: text, 2-16 chars, validate live
    - Error nếu < 2 ký tự
    - Error nếu > 16 ký tự
  - Submit button: disabled cho đến khi name valid
  - Loading state sau submit (gọi POST /api/players)

Notes:
  Backdrop blur nhẹ (backdrop-filter: blur(4px)).
  Hiển thị ở giữa màn hình, không dismissable bằng Escape hay backdrop click.
```

### PlayerRankBadge
```
Props:
  tier: "bronze"|"silver"|"gold"|"platinum"|"diamond"
  elo: number
  size: "sm" | "md"

Rendering:
  - Tier icon: 🥉🥈🥇💎👑
  - ELO number: "1,542" (với thousands separator)
  - size=sm: chỉ icon, tooltip ELO
  - size=md: icon + ELO number
  
Tier → Icon mapping:
  bronze   → 🥉
  silver   → 🥈
  gold     → 🥇
  platinum → 💎
  diamond  → 👑
```

### TimeControlSelector
```
Props:
  value: number | null    — phút (10/20/30/40/50/60) hoặc null
  onChange: (value: number | null) => void

Rendering:
  Grid 3 cols:
  [10p] [20p] [30p]
  [40p] [50p] [ 1h]
  [──∞ Không giới hạn──]
  
  Selected: filled accent background
  Default: 20 phút
  
Notes:
  "Không giới hạn" là một option full-width ở cuối.
  Khi value=null → hiển thị "∞ Không giới hạn" selected.
```

### RankFilterBar
```
Props:
  selected: string | null   — tier đang filter, null = tất cả
  onChange: (tier: string | null) => void

Rendering:
  Horizontally scrollable row of pill chips:
  [Tất cả] [🥉 Bronze] [🥈 Silver] [🥇 Gold] [💎 Platinum] [👑 Diamond]
  
  Active chip: bg-acc/20 border-acc text-acc
  Inactive chip: bg-surface border-border text-text-secondary
  
Notes:
  On mobile: overflow-x: auto, no-scrollbar (scrollbar-hide), snap scroll.
```

### ChatPanel
```
Props:
  messages: ChatMessage[]    — [{id, name, isPlayer, message, timestamp}]
  myDeviceId: string
  mutedDeviceIds: string[]   — deviceIds bị mute
  isHost: boolean            — host có thể mute
  isMuted: boolean           — mình có bị mute không
  onSend: (text: string) => void
  onMute: (deviceId: string) => void
  onUnmute: (deviceId: string) => void

Rendering:
  - Scrollable message list (max-height, overflow-y: auto)
  - Auto-scroll to bottom khi có message mới
  - Message item: [name (spectator: 👁 icon)] [text] [timestamp relative]
  - Input: textarea 1 hàng, maxLength=200, Enter gửi (Shift+Enter = newline)
  - isMuted=true: input disabled, hiện "(Bạn đã bị mute)"
  - isHost=true: hover trên message của người khác → hiện [Mute] button

Message variants:
  my-message:         text-right, bg-acc/15
  player-message:     bg-surface-raised
  spectator-message:  bg-surface, text-text-secondary, "👁" prefix trước tên
  system-message:     italic, centered, text-text-secondary (e.g., "Rồng Đỏ xin hoãn nước")
```

### SpectatorPanel
```
Props:
  spectators: [{name: string, deviceId: string}]
  count: number
  isHost: boolean
  onMute: (deviceId: string) => void

Rendering:
  - "👁 N người đang xem" heading
  - List: mỗi người 1 dòng với tên
  - isHost=true: mỗi dòng có [Mute chat] button
  - Empty: "Chưa có ai xem"
  
Variants:
  inline-panel: hiển thị trong left panel (desktop)
  modal:        hiển thị trong modal (mobile)
```

### TakeBackButton
```
Props:
  allowed: boolean          — allowTakeback setting
  canRequest: boolean       — vừa đi xong, không phải lượt mình
  takebacksUsed: number     — số lần đã dùng (max 3)
  isPending: boolean        — request đang chờ phản hồi
  onRequest: () => void

Rendering:
  - Hidden nếu allowed=false
  - "↩ Xin hoãn (N/3)" — N = số lần còn lại
  - disabled nếu canRequest=false || isPending || takebacksUsed >= 3
  - isPending=true: text đổi thành "Đang chờ đối thủ..." + spinner
```

### TakeBackModal
```
Props:
  isOpen: boolean
  requesterName: string
  onAccept: () => void
  onReject: () => void
  timeoutSeconds: number    — đếm ngược, auto-reject khi về 0

Rendering:
  Banner xuất hiện trên board (không full-screen block):
  "↩ [requesterName] xin hoãn nước vừa đi"
  Progress bar countdown (30s)
  [Từ chối] [Đồng ý]
  
  Auto-reject khi timeout về 0.
```

### BottomActionBar (Mobile only)
```
Props:
  moveCount: number
  unreadChatCount: number
  spectatorCount: number
  onMoveHistory: () => void
  onChat: () => void
  onSpectators: () => void
  onMore: () => void          — mở More menu

Rendering:
  Fixed bottom bar, 4 icon buttons:
  [📜 moveCount] [💬 unreadChatCount hoặc "Chat"] [👁 spectatorCount] [⋯ Thêm]
  
  unreadChatCount > 0: red badge số trên icon 💬
  spectatorCount=0: 👁 icon không có badge
  
  "Thêm" menu (bottom sheet):
    ↩ Xin hoãn nước  (disabled nếu không thể)
    ⚑ Đầu hàng
    🔗 Chia sẻ link
```

---

## Layout Components

### GameLayout
```
Props: children (left panel, board, right panel)
Desktop: 3-column CSS grid (200px | auto | 240px)
Tablet:  2-column (auto | 200px)
Mobile:  single column stack
```

### PageContainer
```
Max-width: 1200px, centered, padding 16-24px
Used on: Lobby, any full-page layout
```
