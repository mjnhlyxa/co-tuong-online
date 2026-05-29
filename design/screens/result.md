# Game End Modal

**Route**: Overlay on `/room/[roomId]` (game playing state)
**Purpose**: Shows game result, allows rematch or exit to lobby

## Layout

### Win State

```
+----------------------------------------------------------+
|                                                          |
|              ✨  CHIẾN THẮNG!  ✨                        |
|                                                          |
|                   Minh thắng!                           |
|              (Checkmate / Hết giờ)                       |
|                                                          |
|           [   Đấu lại   ]   [Thoát   ]                  |
|              primary btn    secondary btn                |
+----------------------------------------------------------+
```

### Loss State

```
+----------------------------------------------------------+
|                                                          |
|                  THUA CUỘC                               |
|                                                          |
|                   Hùng thắng!                           |
|              (Checkmate / Đối thủ逃走)                    |
|                                                          |
|           [   Đấu lại   ]   [Thoát   ]                  |
+----------------------------------------------------------+
```

### Draw State

```
+----------------------------------------------------------+
|                                                          |
|                       HÒA                                |
|                                                          |
|              Cả hai hòa (Thỏa thuận)                     |
|                                                          |
|           [   Đấu lại   ]   [Thoát   ]                  |
+----------------------------------------------------------+
```

## Modal Specifications

| Property | Value |
|---------|-------|
| Background | `--bg-elevated` |
| Border-radius | `--radius-xl` |
| Max-width | 400px |
| Shadow | `--shadow-modal` |
| Backdrop | `rgba(0,0,0,0.7)` with blur |
| Open animation | Fade in 200ms + scale from 0.95 |

## Visual Treatment by Result

| Result | Headline | Subhead | Animation | Color |
|--------|---------|---------|-----------|-------|
| Win | "CHIẾN THẮNG!" | "[Name] thắng!" | Confetti particles | `--success` green |
| Loss | "THUA CUỘC" | "[Name] thắng!" | None | `--danger` red |
| Draw | "HÒA" | Reason text | Handshake emoji | `--warning` yellow |

### Result Reasons
| Reason Code | Vietnamese | English |
|-------------|-----------|---------|
| `checkmate` | Ph将死 | Checkmate |
| `timeout` | Hết giờ | Timeout |
| `resign` | Đối thủ逃走 | Resign |
| `agreement` | Thỏa thuận | Agreed draw |

## Move Summary Panel

| Metric | Value |
|display|
| Total Moves | 38 |
| Game Duration | 12:34 |
| Your Color | Red |
| Final Timer | 2:15 remaining |

Displayed below the headline, smaller text, subtle styling.

## Button Behavior

| Button | Action | Visual |
|--------|--------|---------|
| Rematch | POST /api/rooms/{roomId}/rematch | Primary variant, accent color |
| Exit | Navigate to / (lobby) | Secondary variant, ghost |

### Rematch Flow
1. Click "Đấu lại"
2. Button changes to spinner + "Đang chờ..."
3. Server awaits opponent confirmation
4. If opponent accepts → new game starts, modal closes
5. If opponent declines/offline → toast "Đối thủ không thể rematch" + remains on modal
6. Timeout after 60s → toast "Hết thời gian chờ" + remain

### Exit Flow
1. Click "Thoát"
2. Immediate navigation to / (no confirmation needed since game is over)
3. Room deleted from lobby

## States

### Awaiting Rematch Confirmation
- Button shows spinner
- Text: "Đang chờ đối thủ xác nhận..."
- Opponent sees same modal with their own button states

### Opponent Offline / Unreachable
- Rematch button disabled after action
- Text: "Không thể gửi yêu cầu đến đối thủ"
- Only "Thoát" button active

### Error
- Toast notification with error message
- Modal stays open

## Confetti Animation (Win only)

Triggered on modal open for winner. 50 particles, fall duration 2.5s, random colors (red + gold), fade out before modal close.

---

## Responsive

On mobile (375px): modal is full-screen (90% viewport width). Confetti still plays. Same content, vertically stacked. Buttons full width.
