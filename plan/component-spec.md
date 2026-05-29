# co-tuong-online — Component Specifications

> **C4 Level**: 3 — UI Component Specifications

## 1. UI Components Overview

### 1.1 Component Hierarchy Tree
```
App
├── ui/
│   ├── Button
│   ├── Modal
│   ├── Input
│   ├── Card
│   ├── Badge
│   └── Spinner
└── game/
    ├── GameBoard
    ├── Piece
    ├── PlayerPanel
    ├── MoveHistory
    ├── RoomCard
    ├── RulesModal
    └── GameEndModal
```

## 2. Shared UI Components

### 2.1 Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  type?: 'button' | 'submit';
}
```

**Variants:**
- `primary`: Blue background (#1e40af), white text — "Create Room", "Join"
- `secondary`: Gray outline, dark text — "Cancel", "Leave"
- `ghost`: Transparent, hover highlight — icon buttons
- `danger`: Red (#dc2626) — "Delete Room", "Forfeit"

### 2.2 Modal
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```
- Backdrop: `rgba(0,0,0,0.5)` with blur
- Centered, rounded-2xl, overflow scroll if content too tall
- Close on backdrop click + escape key
- Focus trap when open

### 2.3 Input
```typescript
interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  autoFocus?: boolean;
}
```
- Rounded, border on focus, error state with red border
- Used for room name input, room code input, player name

### 2.4 Card
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}
```
- White background, subtle shadow, rounded-xl
- `hoverable`: translateY(-2px) + deeper shadow on hover

### 2.5 Badge
```typescript
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
interface BadgeProps { variant: BadgeVariant; children: React.ReactNode; }
```
- Rounded-full, small text, colored background/text
- Used to show room status ("Đang chơi", "Đang chờ")

### 2.6 Spinner
```typescript
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; }
```
- SVG-based rotating circle, primary color
- Used during loading states

## 3. Game Components

### 3.1 GameBoard
```typescript
interface GameBoardProps {
  board: Cell[][];           // 10x9 grid
  selectedCell: Position | null;
  validMoves: Position[];
  currentTurn: number;       // 0 or 1
  myPlayerIndex: number;     // which player am I
  onCellClick: (row: number, col: number) => void;
  onCellDragStart: (row: number, col: number) => void;
  onCellDragOver: (row: number, col: number) => void;
  onCellDrop: (row: number, col: number) => void;
  boardSize?: number;         // px (default 540)
}
```

**Visual:**
- 10 columns × 9 rows grid (transposed to 9×10 for screen)
- Board is square, responsive to viewport (min 320px, max 600px)
- Empty cells: alternating subtle tan/beige squares
- Red pieces on top (rows 0–4), black on bottom (rows 5–9)
- River (row 4–5): painted blue with "Vạn" watermark
- Palace borders: marked with darker highlight
- Coordinate labels (1–9 from left to right, a–k for indexing)

**Interaction:**
- Desktop: click to select + click to move; OR drag-and-drop
- Mobile: tap-to-select + tap-to-move (no drag)
- Selected cell: highlighted with golden ring
- Valid moves: shown as small green dots on valid target cells
- Hovering own piece: cursor pointer
- My turn only: can interact; opponent turn: board non-interactive

### 3.2 Piece
```typescript
interface PieceProps {
  piece: { type: PieceType; color: Color };
  position: Position;
  isSelected?: boolean;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}
```

**Visual Design:**
- Each piece is a colored circle with Chinese-inspired character
- Red pieces: red background, white character, white border
- Black pieces: dark background, red/gold character, gold border
- SVG character (not image) for crisp scaling
- Box shadow for 3D lifted appearance
- Selected: golden glow around piece

**Piece Types & Characters:**
| Type | Red Char | Black Char |
|------|---------|-----------|
| GENERAL | 帥 | 將 |
| ADVISOR | 仕 | 士 |
| ELEPHANT | 相 | 象 |
| CHARIOT | 車 | 車 |
| HORSE | 馬 | 馬 |
| CANNON | 炮 | 炮 |
| SOLDIER | 兵 | 卒 |

### 3.3 PlayerPanel
```typescript
interface PlayerPanelProps {
  player: { id: string; name: string; isHost: boolean };
  isCurrentTurn: boolean;
  timeBank: number;            // seconds remaining
  isConnected: boolean;
  isMyPlayer: boolean;
  position: 'top' | 'bottom';  // which side of board
}
```

**Visual:**
- Horizontal strip above (player 0) or below (player 1) the board
- Shows: player avatar circle (initial letter), name, host badge, timer
- Turn indicator: highlighted border + pulsing dot when active
- Timer: MM:SS format, turns red under 30 seconds
- Disconnected: grayed out with "Đã ngắt kết nối" badge
- "Bạn" label for own panel

### 3.4 MoveHistory
```typescript
interface MoveHistoryProps {
  moves: MoveRecord[];
  currentMoveIndex: number;
  onMoveClick?: (index: number) => void;
}
```

**Visual:**
- Scrollable list, 8 entries visible
- Each entry: move number, notation, player name
- Current turn highlighted in amber
- Clickable to jump to board position at that move
- Toggle expand/collapse on mobile

### 3.5 RoomCard (Lobby)
```typescript
interface RoomCardProps {
  room: { id: string; name: string; code: string; status: string; players: Player[] };
  onJoin: (roomId: string) => void;
  onSpectate?: (roomId: string) => void;
}
```

**Visual:**
- Card with room name, host name, player count
- Status badge: "Đang chờ" (waiting), "Đang chơi" (playing)
- "Tham gia" button — primary if room is joinable
- "Theo dõi" button — secondary for spectating

### 3.6 RulesModal
```typescript
interface RulesModalProps { isOpen: boolean; onClose: () => void; }
```
- Full-screen modal on mobile, 600px max-width on desktop
- Sections for each piece type with movement diagram
- SVG board illustrations showing valid moves per piece
- Vietnamese language throughout

### 3.7 GameEndModal
```typescript
interface GameEndModalProps {
  isOpen: boolean;
  result: GameResult;
  onRematch: () => void;
  onExit: () => void;
  myPlayerIndex: number;
}
```
- Shows winner name, result reason (with Vietnamese translation)
- "Đấu lại" (rematch) and "Thoát" (exit) buttons
- Confetti animation for winner's side

## 4. Responsive Breakpoints

| Breakpoint | Width | Board Size | Layout |
|-----------|-------|-----------|--------|
| Mobile | 375px | 320px | Stacked panels, board centered |
| Tablet | 768px | 480px | Side panels, board centered |
| Desktop | 1024px | 600px | Full layout, board center |

## 5. Color Palette

```css
:root {
  /* Board */
  --board-light: #e8d5b7;
  --board-dark: #d4c4a0;
  --board-river: #a8d4e6;
  --board-palace: #c9b896;
  
  /* Pieces */
  --piece-red-bg: #dc2626;
  --piece-red-char: #ffffff;
  --piece-black-bg: #1f2937;
  --piece-black-char: #fbbf24;
  
  /* UI */
  --primary: #1e40af;
  --primary-hover: #1e3a8a;
  --secondary: #6b7280;
  --success: #16a34a;
  --warning: #ca8a04;
  --danger: #dc2626;
  --background: #f3f4f6;
  --surface: #ffffff;
  --text-primary: #111827;
  --text-secondary: #6b7280;
}
```
