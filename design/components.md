# co-tuong-online — Component Specifications

> Implementation checklist derived from design system

## Game Components

### GameBoard
**Purpose**: Main 10×9 Cờ Tướng board  
**Used on**: `game.md` screen  
**Props**:
- `board`: `Cell[][]` (10 rows × 9 cols)
- `selectedCell`: `Position | null`
- `validMoves`: `Position[]`
- `currentTurn`: `0 | 1`
- `myPlayerIndex`: `0 | 1`
- `lastMove`: `Move | null`
- `checkPosition`: `Position | null` (king in check)
- `onCellClick`: `(row, col) => void`
- `boardSize`: `number` (px)

**States**:
- Default (board displayed)
- Selected (piece highlighted, valid moves shown)
- Check (king cell pulsing red)
- Animating (piece moving between positions)
- Disabled (not your turn, modals open)

### Piece
**Purpose**: Individual board piece with Chinese character  
**Used on**: `GameBoard`  
**Props**:
- `piece`: `{ type: PieceType; color: Color }`
- `position`: `Position`
- `isSelected`: `boolean`
- `isValidMove`: `boolean`
- `isCheck`: `boolean`
- `isLastMove`: `boolean`
- `onClick`: `(row, col) => void`

**Variants by piece type and color** — 14 combinations:
- Red pieces: 帥 (General), 仕 (Advisor), 相 (Elephant), 車 (Chariot), 馬 (Horse), 炮 (Cannon), 兵 (Soldier × 5)
- Black pieces: 將, 士, 象, 車, 馬, 炮, 卒

### PlayerPanel
**Purpose**: Display player info, timer, connection status above/below board  
**Used on**: `game.md` screen  
**Props**:
- `player`: `{ id, name, isHost, color }`
- `isCurrentTurn`: `boolean`
- `timeBank`: `number` (seconds)
- `isConnected`: `boolean`
- `isMyPlayer`: `boolean`
- `position`: `'top' | 'bottom'`

**States**:
- Default
- Your turn (pulsing indicator)
- Low time (red timer, <30s warning)
- Disconnected (grayed out, red dot)
- Winner (highlighted)

### MoveHistory
**Purpose**: Scrollable list of move notations  
**Used on**: `game.md` screen  
**Props**:
- `moves`: `MoveRecord[]`
- `currentMoveIndex`: `number`
- `orientation`: `'red' | 'black'` (whose perspective)

**States**:
- Collapsed (mobile default)
- Expanded
- Empty ("Chưa có nước đi nào")

### RulesModal
**Purpose**: Full-piece movement reference with diagrams  
**Used on**: `home.md`, `game.md`  
**Props**: `isOpen`, `onClose`  
**Sections**: 7 piece types × 2 columns each (description + SVG diagram)

### GameEndModal
**Purpose**: Win/loss result display with rematch option  
**Used on**: `game.md` (after game over WS event)  
**Props**: `result`, `players`, `myPlayerIndex`, `onRematch`, `onExit`  
**States**: Win, Loss, Draw, AwaitingRematch, OpponentOffline

### RoomCard
**Purpose**: Single room listing in lobby  
**Used on**: `home.md` screen lobby section  
**Props**: `room`, `onJoin`, `onSpectate`  
**States**:
- Waiting (can join)
- Full (spectate only)
- Playing (spectate only)

### CreateRoomModal
**Purpose**: Form to create new room  
**Used on**: `home.md`  
**Props**: `isOpen`, `onClose`, `onCreated: (roomId, code) => void`  
**Fields**: room name, player name, private toggle  
**States**: Idle, Submitting, Error (field-level validation messages)

### Toast
**Purpose**: Ephemeral notification  
**Props**: `message`, `variant: 'success' | 'error' | 'info'`, `duration`  
**Behavior**: Slides in from bottom, auto-dismisses

## Shared UI Components

### Button
**Props**: `variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'`, `size: 'sm' | 'md' | 'lg'`, `disabled`, `loading`, `onClick`, `children`  
**States**: default, hover, active, disabled, loading

### Input / TextInput
**Props**: `value`, `onChange`, `placeholder`, `maxLength`, `error`, `autoFocus`, `size: 'sm' | 'md'`  
**States**: default, focused, error, disabled

### Modal
**Props**: `isOpen`, `onClose`, `title`, `children`, `size: 'sm' | 'md' | 'lg'`  
**States**: opening (fade + scale), open, closing

### Card
**Props**: `children`, `className`, `hoverable`, `onClick`  
**States**: default, hover (if hoverable)

### Badge
**Props**: `variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'`  
**Used for**: Room status ("Đang chờ", "Đang chơi"), player badges

### Spinner
**Props**: `size: 'sm' | 'md' | 'lg'`  
**Variants**: inline (small, text accompaniment), standalone (loading screens)

### Avatar
**Purpose**: Player identifying circle with initial letter  
**Props**: `name`, `color` (red/black piece color for game avatar, neutral for lobby)  
**States**: default, connected (green ring), disconnected (red ring)

### Toggle
**Props**: `checked`, `onChange`, `label`  
**States**: off, on

---

## Implementation Order Priority

1. **Button** — all UI builds from this
2. **Card** + **Badge** — used in lobby
3. **Input** — used in create room modal
4. **Modal** — base for create room, rules, game end
5. **Toast** — all notifications
6. **GameBoard** + **Piece** — core display components
7. **PlayerPanel** — panel above/below board
8. **MoveHistory** — sidebar list
9. **RoomCard** — lobby list items
10. **CreateRoomModal** — lobby action
11. **RulesModal** — accessible from multiple screens
12. **GameEndModal** — game completion
13. **Spinner**, **Avatar**, **Toggle** — supporting components

---

## Status Indicators

| Indicator | Visual | State |
|-----------|--------|-------|
| Turn dot | 8px pulsing circle | Green=my turn, gray=opponent |
| Connection dot | 6px small circle | Green=connected, red=disconnected |
| Room status badge | Pill badge | "Đang chờ" (success), "Đang chơi" (warning) |
| Time warning | Timer text color | Normal → yellow <60s → red <30s |
| Check warning | Red pulsing cell overlay | Pulsing red on king's cell |

---

## Design Fidelity Checklist

- [ ] All font sizes match `--text-*` scale
- [ ] All spacing uses `--space-*` scale
- [ ] All border-radius uses `--radius-*` scale
- [ ] All colors from CSS variables (no hardcoded hex in components)
- [ ] Piece characters are SVG-rendered (not img tag) for crisp scaling
- [ ] Animations durations from spec (200ms, 250ms, 300ms)
- [ ] Mobile breakpoints at `--bp-*` breakpoints
- [ ] Touch targets all ≥ 44×44px on mobile
