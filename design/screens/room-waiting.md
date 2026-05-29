# Room Waiting Screen

**Route**: `/room/[roomId]`
**Purpose**: Shows a created room waiting for the second player to join

## Layout (Desktop)

```
+────────────────────────────────────────────────────────────────────+
|  [Logo] Cờ Tướng Online             [Rules: ?]                   |
+────────────────────────────────────────────────────────────────────+
|                                                                    |
|            +--------------------------------------------+          |
|            |         PHÒNG CỦA MINH                      |          |
|            |                                            |          |
|            |    Mã phòng:  X7K2M1                       |          |
|            |    [📋 Sao chép]  [🔗 Chia sẻ]             |          |
|            |                                            |          |
|            |    +----------------------+                 |          |
|            |    | [Your avatar] Minh   | ← Bạn (Host)   |          |
|            |    +----------------------+                 |          |
|            |                                            |          |
|            |    +----------------------+                 |          |
|            |    | [Empty avatar] ???   | ← Đang chờ...  |          |
|            |    +----------------------+                 |          |
|            |                                            |          |
|            |    Đang chờ đối thủ...                      |          |
|            |    [••• Animated dots •••]                  |          |
|            |                                            |          |
|            |    [ Thoát ]                               |          |
|            +--------------------------------------------+          |
|                                                                    |
+------------------------------------------------------------margin-+
```

## Layout (Mobile — 375px)

```
+--------------------------------+
|  Cờ Tướng Online        [?]   |
+--------------------------------+
|                                |
|      PHÒNG CỦA MINH            |
|      ─────────────────         |
|                                |
|   Mã phòng: X7K2M1             |
|   [Sao chép] [Chia sẻ]         |
|                                |
|   +------------------------+    |
|   | [M] Minh    (Host)     |   |
|   +------------------------+    |
|                                |
|   +------------------------+    |
|   | [?] Đang chờ...        |   |
|   +------------------------+    |
|                                |
|   Đang chờ đối thủ...          |
|   [animating spinner]          |
|                                |
|   [        Thoát        ]      |
+--------------------------------+
```

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Room Name | Displayed prominently at top | Static, host-set |
| Room Code | 6-char monospace, displayed in accent color box | Click to auto-select for copy |
| Copy Button | Icon button (clipboard) | Copies code to clipboard, shows toast "Đã sao chép!" |
| Share Button | Icon button (link) | Copies full URL to clipboard, shows toast |
| Player Slot 1 | Panel showing current player (host) | Name + avatar initial + "(Host)" badge |
| Player Slot 2 | Empty with "?" avatar | Shows "Đang chờ..." placeholder |
| Waiting Text | "Đang chờ đổ thủ..." with animated dots | Replaced when opponent joins |
| Leave Button | Secondary ghost button | Confirms → returns to / |
| Rules Button | Ghost `?` button | Opens Rules Modal |

## States

### Waiting (Default)
Room created, waiting for opponent.

### Opponent Joined (transition)
500ms flash animation: room code expands, both player panels glow simultaneously, then auto-redirects.

### Error
- Invalid room (deleted/never existed) → redirect to / with toast "Phòng không tồn tại."
- Room full / game already started → redirect to game page directly.

### Reconnecting
If WebSocket drops: "Mất kết nối. Đang kết nối lại..." overlay.

## Key Interactions

### Copy Code
1. Click copy button
2. `navigator.clipboard.writeText(code)` executed
3. Toast appears: "Đã sao chép mã phòng!"
4. Toast auto-dismisses in 2s

### Share Link
1. Click share button
2. Full URL `https://co-tuong-online.vercel.app/room/X7K2M1` copied
3. Toast: "Đã sao chép đường liên kết!"

### Opponent Joins
1. WebSocket receives `player_joined` event
2. Player Slot 2 fills with opponent name
3. 500ms delay (visual confirmation)
4. Redirect to game page (same URL, playing state)

### Leave Room
1. Click "Thoát"
2. Confirmation (mobile: swipe up sheet or alert)
3. DELETE /api/rooms/{roomId} called
4. Redirect to / (lobby)

## WebSocket Events on This Screen

| Event | Action |
|-------|--------|
| `player_joined` | Fill second slot, then redirect |
| `game_update` | Game started (unexpected, redirect) |
| `error` | Show error toast |
| `ping` | Respond with `pong` |

---

## Mobile Considerations
- Code box always visible and tappable
- Share/Copy buttons are large enough for thumb-tap (min 44px)
- Back button uses native swipe-back gesture on iOS/Android
- No landscape orientation support needed for waiting screen
