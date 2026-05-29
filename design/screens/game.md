# Game Screen

**Route**: `/room/[roomId]` (playing state)
**Purpose**: Main gameplay - board, turn-based moves, real-time opponent sync

## Layout (Desktop — 1024px+)

```
+---------------------------------------------------------------+
|  [Logo] Cờ Tướng Online     [?] [Settings]                    |
+---------------------------------------------------------------+
|                                                               |
|  +--------+  +------------------------------------------+  +-+ |
|  | [Player 1 panel — opponent]                       |  |MH| |
|  | [M] Hùng · 4:32  · ● ●                      |  |  | |
|  | [Host badge if applicable]                     |  |  | |
|  +--------+                                      |  |  | |
|  |                                               |  |  | |
|  |         +-------------------------------+     |  |  | |
|  |         |  GAME BOARD (9 cols × 10 rows)|     |  |  | |
|  |         |  Pieces displayed here        |     |  |  | |
|  |         |  River, palace lines,         |     |  |  | |
|  |         |  coordinate labels            |     |  |  | |
|  |         +-------------------------------+     |  |  | |
|  |                                               |  +-+ |
|  +--------+  +------------------------------------------+---+ |
|  | [Player 0 panel — you]                        |Moves| |
|  | [T] Minh · 3:45 · ●                         |Hist| |
|  | "(Bạn)" label if player                      |ory | |
|  +--------+                                      |    | |
|                                                           |   |
+-----------------------------------------------------------+---+
```

## Layout (Tablet — 640–1024px)

```
+------------------------------------------+
|  [Logo] Cờ Tướng Online             [?]  |
+------------------------------------------+
|  [Opponent Panel — compact]              |
|  Hùng · 4:32 · ●                         |
+------------------------------------------+
|                                          |
|       +--------------------------+        |
|       |       GAME BOARD         |        |
|       |     (center, 432px)      |        |
|       +--------------------------+        |
|                                          |
+------------------------------------------+
|  [Your Panel — compact]                  |
|  Minh · 3:45 · ● (you)                   |
+------------------------------------------+
|  Move History (collapsed by default)      |
|  [Chevron: expand/collapse]              |
+------------------------------------------+
```

## Layout (Mobile — 375px)

Single column. Board fills width (315px). Player panels narrow horizontal strips above and below board. Move history hidden behind toggle button.

```
+------------------------------------------+
|  Hùng · 4:32  [● waiting]               |
+------------------------------------------+
|  +------------------------------------+  |
|  |                                    |  |
|  |       GAME BOARD (315px)           |  |
|  |                                    |  |
|  |  Click piece → highlight → click   |  |
|  |  destination → move commits        |  |
|  |                                    |  |
|  +------------------------------------+  |
+------------------------------------------+
|  Minh · 3:45  [● your turn]             |
+------------------------------------------+
|  [Move History ↗] [Rules ?]              |
+------------------------------------------+
```

## Board Grid Details

The board is 9 columns × 10 rows, but Cờ Tướng is traditionally shown rotated 90 degrees, so Red (top/North) starts at row 0, Black (bottom/South) at row 9. The visual on screen renders:
- Columns labeled 1–9 (left to right from Red's perspective)
- Red pieces at top (rows 0–4)
- Black pieces at bottom (rows 5–9)
- River: intersection of center two horizontal lines, filling rows 4–5 of the grid overlay

### Board Cell States
| State | Visual |
|-------|--------|
| Default (empty) | `--board-light` / `--board-dark` alternating |
| Own piece, my turn | Cursor pointer on hover |
| Selected (own piece) | Golden ring + slight scale-up of piece |
| Valid move target | Green dot overlay (35% cell width centered) |
| Last move (from/to) | Amber tint on both from and to cells |
| Check (king in danger) | Red tint pulsing on king's cell |
| Capture | Piece animates out to captured zone |

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Opponent Panel | Horizontal strip above board | Name, timer, connection dot, badge |
| Game Board | 9×10 CSS grid, aspect ratio 1:1 | Click/drag interaction |
| Player Panel (you) | Horizontal strip below board | Your name, timer, turn indicator |
| Move History | Scrollable list, 5-col notation | Expandable on mobile |
| Rules Button | Ghost `?` icon, top right | Opens Rules Modal |
| Your Turn Indicator | Pulsing dot + "Lượt của bạn" text | Visible when it's your turn |
| Opponent Turn Indicator | Dot grayed + "Đang chờ đối thủ..." | Visible when opponent's turn |

### Player Panel Details

| Sub-element | Appearance |
|-------------|-----------|
| Avatar Circle | 36px circle, letter initial (M for Minh), colored ring by piece color |
| Name | 16px, truncated if too long |
| Timer | MM:SS format in monospace, warning color at <60s, red at <30s |
| Turn Dot | 8px circle, pulsing green if your turn, gray if not |
| Host Badge | "(Host)" in small text next to name |
| Connected Status | Small dot: green = connected, red = disconnected |
| "Bạn" Label | "(Bạn)" in accent color for own panel |

## States

### My Turn — Active
- Board fully interactive
- Your pieces show hover effect (scale 1.05)
- Click own piece → selected (golden), valid moves shown as dots
- Click valid move → move submitted → waiting for server confirmation

### Opponent's Turn — Waiting
- Board right side (opponent's pieces) slightly dimmed (opacity 0.85)
- No hover effects on any piece
- Your pieces shown but non-interactive
- "Đang chờ đối thủ..." shown in your player panel

### Check State
- The General/King cell has pulsing red overlay
- Any move that doesn't resolve the check should be rejected by server
- Server sends `check` event on every move that creates check

### Pending Move (Server Processing)
- After clicking valid move: board briefly shows arrow from -to with "+" animation
- While awaiting server response: all interactions disabled (300ms timeout)
- If move rejected: board returns to pre-move state, error toast shown

### Disconnected Overlay
- Full-board semi-transparent overlay
- "Mất kết nối. Đang kết nối lại..." centered text
- Reconnect triggers automatically

### Checkmate — Game End
- GameEndModal appears immediately
- Board non-interactive
- Winner announcement with player's name

## Key Interactions

### Piece Selection
1. User clicks own piece (when it's their turn)
2. Piece scales up (1.1×), golden ring appears
3. Valid moves shown as green dots on board
4. Click elsewhere → deselect

### Move Execution
1. User clicks destination cell with green dot
2. Move submitted via WebSocket (with immediate optimistic UI update)
3. Piece slides to new position (200ms ease-out)
4. If capture: captured piece fades out as it moves to captured zone
5. Move recorded in history panel
6. Turn passes to opponent

### Timer
- Each player has 5-minute (300s) time bank
- Timer displayed in opponent panel (top) and your panel (bottom)
- If timer reaches 0: automatic loss for that player
- Server is authoritative on timer

### Rules Modal
1. Click `?` button near board
2. Modal opens with all piece rules + movement diagrams
3. Press Escape or click backdrop to close

## WebSocket Events on This Screen

| Event | Action |
|-------|承认|
| `game_update` | Merge new game state; re-render board |
| `game_over` | Show GameEndModal |
| `player_status` | Update connection indicator on player panel |
| `ping` | Respond with `pong` |
| `error` | Show error toast with message |

## Mobile Considerations
- Board fills full width (315px min)
- All touch targets minimum 44×44px
- Tap-to-select-tap-to-move only (no drag-and-drop on mobile)
- Move history collapsed by default, expandable via button
- Player panels are horizontal strips, minimal height
- No landscape support (refuse to enter landscape or rotate to portrait prompt)
