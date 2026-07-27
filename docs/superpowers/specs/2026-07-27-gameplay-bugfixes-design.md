# Gameplay Bugfixes — Design Spec

**Date**: 2026-07-27
**Project**: Cờ Tướng Online (co-tuong-online)
**Production URL**: https://co-tuong-online.vercel.app
**Status**: Draft

## Goal

Fix 7 production bugs in the game screen, replay page, and game logic. Deploy via 3 focused PRs (one per concern) with Vercel preview verification between each.

## Bugs to Fix

| # | Bug | Root Cause | File:Line |
|---|---|---|---|
| 1 | Player info occupies top/bottom of board, board not maximized | `PlayerPanel` rendered vertically (top + bottom) | `src/app/game/[roomId]/page.tsx:416-451` |
| 2 | Crease/fold effect misaligned with grid lines | `wood-grain` SVG pattern uses fixed 15/30/45px not aligned with 64px cell grid | `src/components/game/Board.tsx:254-259` |
| 3 | Replay CTAs below board, board not maximized | Same vertical layout issue | `src/components/game/ReplayView.tsx:88-101` |
| 4 | **Pieces duplicate / overlay after 3-4 moves** | `key={code}` causes React to merge pieces with same code (5 red pawns share key `r-zu`) | `src/components/game/Board.tsx:222-228` |
| 5 | **Player auto-resigns despite time still counting** | `ABANDONED_TIMEOUT_MS = 30_000` too aggressive; heartbeat at 20s allows race condition | `src/app/api/games/[roomId]/route.ts:8` |
| 6 | Pieces have inconsistent shadows | SVG `drop-shadow` filter rendering varies per browser/state | `src/components/game/Board.tsx:126` |
| 7 | Replay view missing player info | `ReplayView` only displays winner at end of scrub, no player panels | `src/components/game/ReplayView.tsx:88-130` |

## Strategy: 3 PRs by Concern

### PR 1 — Layout & Player Info (Bugs 1, 3, 7)

**Scope**: Reposition player info to maximize board size on both game and replay pages.

**Changes**:

1. **`src/app/game/[roomId]/page.tsx`** — Restructure layout:
   - On desktop (`lg:`+), move `PlayerPanel` from top/bottom to **left and right** of the board (vertical stacking)
   - Keep mobile layout as-is (vertical stack)
   - Use CSS Grid: `grid-cols-[auto_1fr_auto]` on desktop
   - Reduce intra-board elements: turn indicator, action buttons stay inline
   - Board width: keep `max-w-[760px]` but allow it to grow vertically (use `min-height: 0`)

2. **`src/components/game/ReplayView.tsx`** — Convert to horizontal layout:
   - Wrap board + player panels in a side-by-side grid on desktop
   - Move replay controls (slider, autoplay, speed) to right side on desktop
   - On mobile, keep vertical stack

3. **`src/components/game/ReplayView.tsx`** — Add player panels:
   - Render `PlayerPanel` (or a slimmer variant) for both red and black above/below board
   - Show player name, ELO, color indicator
   - Reuse `PlayerPanel` component but pass disabled state (no timer, no interaction)

**Layout sketch (desktop, md+)**:

```
┌──────────────────────────────────────────────────────────┐
│ Header (back, room ID, share, settings)                  │
├──────────────────────────────────────────────────────────┤
│  Opponent    │                              │  Sidebar  │
│  panel       │       Board (760px)          │  chat     │
│  (top)       │                              │  history  │
│  ──────────  │                              │  spect.   │
│              │                              │           │
│  Board       │                              │           │
│              │                              │           │
│  ──────────  │                              │           │
│  My panel    │                              │           │
│  (bottom)    │                              │           │
└──────────────────────────────────────────────────────────┘
```

**Acceptance**:
- [ ] Board fits screen with full visibility on 1280×800 desktop
- [ ] Player name, ELO, color visible during all replay steps
- [ ] Mobile layout unchanged

### PR 2 — Board Rendering (Bugs 2, 4, 6)

**Scope**: Fix board's visual artifacts and piece rendering.

**Changes**:

1. **`src/components/game/Board.tsx`** — Remove crease/fold effect:
   - Replace `wood-grain` pattern with a flat solid color or simple gradient
   - Remove the curved black lines at y=15, 30, 45
   - Keep the wood-frame and board-frame look but simpler

2. **`src/components/game/Board.tsx`** — Fix duplicate pieces bug:
   - Change `key={code}` to `key={`${code}-${row}-${col}`}` for **initial rendering**
   - Track pieces by stable instance ID across renders. Use a Map that assigns each piece code a unique ID based on its initial position. When a piece moves, it keeps the same ID.
   - Concrete approach: maintain a `pieceInstanceMap` ref that maps `code -> uniqueId` based on first-seen position. When iterating the board, look up the unique ID for each piece's code.
   - This preserves the FLIP animation (same piece → same DOM element) while still giving each piece a unique React key.

3. **`src/components/game/Board.tsx`** — Standardize shadows:
   - Use a single SVG `<filter id="piece-shadow">` defined once in `<defs>`
   - Apply `filter="url(#piece-shadow)"` to all pieces uniformly
   - Remove inline `drop-shadow` from individual pieces

**Implementation note for Bug 4**: The current code uses `code` as key. The fix needs to track pieces by their identity (which specific pawn moved), not just by their type. Suggested approach:

```typescript
// Build a stable mapping: code -> unique instance id
const pieceInstanceMap = new Map<string, string>()
const seenCodes = new Set<string>()
// ...
if (code && !seenCodes.has(code + '@' + r + ',' + c)) {
  // First time seeing this piece code at this position - assign ID
  pieceInstanceMap.set(code + '@' + r + ',' + c, `${code}-${r}-${c}`)
  seenCodes.add(code + '@' + r + ',' + c)
}
```

Better: post-process the piece list to assign unique IDs based on count:

```typescript
const pieceCounts: Record<string, number> = {}
const pieceList = []
for (let r = 0; r < 10; r++) {
  for (let c = 0; c < 9; c++) {
    const code = board[r]?.[c]
    if (code) {
      pieceCounts[code] = (pieceCounts[code] ?? 0) + 1
      pieceList.push({ code, row: r, col: c, key: `${code}-${pieceCounts[code]}` })
    }
  }
}
```

This gives each piece a unique key (e.g., `r-zu-1`, `r-zu-2`, ...) but the key is re-evaluated each render, so FLIP animation breaks. To preserve FLIP, we need a stable mapping.

**Recommended approach**: Use a `useRef` Map that tracks each piece's unique ID across renders. On first render, assign IDs based on position. On subsequent renders, look up by position-with-code match.

**Acceptance**:
- [ ] No more duplicate pieces after 3-4 moves
- [ ] FLIP animation still works smoothly
- [ ] Board texture is clean (no misaligned fold lines)
- [ ] All pieces have visually identical shadows

### PR 3 — Game Logic (Bug 5)

**Scope**: Fix auto-resign race condition.

**Changes**:

1. **`src/app/api/games/[roomId]/route.ts`** — Increase abandoned timeout:
   - Change `ABANDONED_TIMEOUT_MS = 30_000` → `ABANDONED_TIMEOUT_MS = 90_000` (90s)
   - This gives heartbeat (20s) + buffer for network blips

2. **`src/app/api/games/[roomId]/route.ts`** — Only check abandoned when triggered:
   - Currently: every GET triggers abandoned check
   - Fix: Move abandoned check to heartbeat route only (called every 20s by client)
   - GET route just returns current state without modifying game outcome
   - This separates concerns: GET is read-only, POST actions (heartbeat, move) handle state changes

3. **`src/app/api/games/[roomId]/heartbeat/route.ts`** — Centralize abandoned check:
   - Add the same abandoned detection logic from GET
   - Heartbeat runs every 20s, so check against 90s threshold = 4.5 heartbeats missed
   - Get route just returns data without auto-ending game

4. **`src/app/api/games/[roomId]/route.ts`** — Add explicit ping endpoint alternative:
   - Optional: keep `heartbeat` as the canonical "I'm here" signal
   - Backend won't end game unless heartbeat is missing for 90s+ while another player is actively sending heartbeats

**Race condition analysis**:
- Player A online, heartbeat every 20s (`lastSeen[A]` updated each time)
- Player B has been idle, `lastSeen[B]` not updated
- After 30s: B's `lastSeen[B]` is 30s old, but A's is fresh
- GET fires: server checks `lastSeen[currentTurn]`. If currentTurn is B, B has 30s+ → game ends
- BUT: A's heartbeat fires every 20s, and heartbeat only updates A's own `lastSeen[A]`, not B's
- So B's `lastSeen[B]` stays stale until B comes back

**Root cause**: 30s is too short. The 20s heartbeat has a 10s buffer margin. Any network blip or browser throttling can push past 30s.

**Fix**: 90s gives 70s buffer = 3.5 missed heartbeats. Much more forgiving.

**Acceptance**:
- [ ] Player can be idle for up to 90s without losing
- [ ] Player still loses if they truly disconnect for 90s+
- [ ] No false resigns during normal play

## Deployment Workflow

1. **PR 1 (Layout)**: Branch `fix/game-layout` → push → create PR → Vercel preview URL → user verifies → merge → auto-deploy
2. **PR 2 (Board rendering)**: Branch `fix/board-rendering` → push → preview → verify → merge → deploy
3. **PR 3 (Game logic)**: Branch `fix/auto-resign-timeout` → push → preview → verify → merge → deploy

After each merge, Vercel auto-deploys to production. User verifies on production URL.

## Testing Strategy

**Manual verification** (no automated tests for these UI bugs):
- Reproduce each bug on production before fix
- Verify bug gone after fix on preview URL
- Mobile + desktop viewports
- Light + dark themes

**Run e2e test** (`scripts/e2e-8p-tournament.js`) after PR 2 and PR 3 to ensure no regression in game logic.

## Out of Scope

- Ranking board bug (also observed on production but not in user's list)
- New features (e.g., sound effects, animations)
- Performance optimization
- Mobile-specific improvements beyond layout

## Risks

- **PR 2**: Changes to piece key could affect FLIP animation. Need careful testing.
- **PR 3**: Increasing timeout may delay real abandoned-game detection. 90s is a balance.
- **Layout**: Moving panels to sides may affect very wide screens. Use `xl:` breakpoint carefully.

## Success Criteria

- All 7 user-reported bugs fixed on production
- No regression in existing functionality
- E2E test still passes
- Visual quality improved (no duplicates, even shadows, clean wood texture)
