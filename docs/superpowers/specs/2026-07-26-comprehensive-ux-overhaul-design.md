# Comprehensive UX Overhaul & E2E Tournament Test

**Date:** 2026-07-26
**Status:** Draft for review

## Goal

Take the existing cờ tướng online app from "functional but rough" to "commercial-ready, polished, fully tested". Specific deliverables:

1. **Comprehensive UI/UX redesign** — full overhaul of game page, lobby, tournament, modals. Keep features, change visuals freely.
2. **500ms piece move animation** on the 2D board with clear from-position highlight after the move.
3. **3D board** that's a polished top-down view (not rotatable) with proper shadows, full board visible, good-looking pieces.
4. **Both 2D and 3D equal quality** — user can toggle and either feels premium.
5. **Full E2E 8-player tournament to completion** — 28 matches played in real with both players clicking moves, final standings correct.
6. **Commercial-ready** — SEO, accessibility, no P0 bugs.

## Architecture

### 1. Game Page Layout (rebuilt)

**Current problems:**
- Board doesn't fill player info width
- 2D board pieces too small
- 3D board has visibility issues (board extends beyond viewport, pieces unclear)
- Sidebar tabs are bad UX (forces user to switch)
- Sections don't have proper visual hierarchy
- 500ms move animation not verified working
- From-position highlight weak

**New layout (desktop, ≥1024px):**
```
┌────────────────────────────────────────────┬──────────────┐
│ [Opponent panel — full width of board col]  │  Spectators  │
│ [Big 3D/2D board — bigger than now]        │  (compact)   │
│ [My panel — full width of board col]        ├──────────────┤
│ [Action bar]                                │  Moves       │
│                                             │  (scroll)    │
│                                             ├──────────────┤
│                                             │  Chat        │
└────────────────────────────────────────────┴──────────────┘
```

All 3 sections visible at once on desktop. No tabs.

**Mobile (<1024px):**
- Board full width
- Action bar (resign, takeback, more) at bottom fixed
- Bottom tab drawer for moves/chat/spectators (single tap to open)

### 2. 2D Board (SVG with FLIP animation)

**Files:** `src/components/game/Board.tsx`

**Specs:**
- Cell size: 64px (up from 60)
- Piece radius: 28px (up from 24)
- Font size for character: 26px (up from 24)
- Board max-width: 720px (up from 640px, matches player panels)
- Wood texture background, gradient
- Grid lines: thick dark brown

**Move animation (FLIP):**
- On piece move: 500ms translate from old to new position with `cubic-bezier(0.4, 0, 0.2, 1)`
- Implementation: track `prevPos` per piece, render initial transform offset, force reflow, animate to 0
- Piece Y also lifts slightly during animation (peak at 50%, 0.15 units)

**Highlight after move:**
- `lastMove.from` position: gold filled rect (semi-transparent), pulsing via `animate` SVG element (opacity 1→0.6→1 over 2s)
- `lastMove.to` position: gold outline rect (slightly smaller, lighter)
- These highlights persist until next move

**Check indicator:**
- King in check: red expanding ring around the king, pulsing

**Selection:**
- Selected piece: blue ring (expanding via animation)
- Valid move targets (empty): small blue circle
- Valid captures: corner brackets in blue

### 3. 3D Board (three.js top-down, fixed camera)

**Files:** `src/components/game/Board3D.tsx`

**Camera:**
- Position: `[0, 14, 1]` (slightly tilted top-down)
- FOV: 38
- Static — no orbit controls (user explicitly said no rotation)
- Camera far/near adjusted so full board visible

**Board:**
- Surface: 9x10 cell with wood texture (procedural via gradient)
- Frame: dark brown border 0.6 units wider
- Grid lines: 0.022 wide boxes (not LineSegments — much more visible)
- Edge dots: small dark dots at cannon/pawn starting positions
- River text: 楚河 漢界 via Canvas texture

**Pieces:**
- Cylinder: radius 0.42, height 0.16
- Top: domed hemisphere (gives 3D look)
- Color: red (#dc2626) or black (#1a1f2e)
- Character: Canvas-rendered texture on top face (CJK chars)
- Shadow: ContactShadows below each piece (soft, 0.06 offset)

**Move animation (lerp):**
- Track prev position per piece
- `useFrame` lerp at 0.12/frame → ~500ms to reach target
- Y position lifts 0.15 during animation

**Highlight:**
- from-position: gold ring (filled, semi-transparent)
- to-position: gold ring (outline)
- selected: pulsing gold ring
- in check: red expanding ring

### 4. Sidebar — Single Page, No Tabs (desktop)

**Files:** `src/components/game/GameSidebar.tsx`

**Layout (3 vertical sections, all visible):**
- Spectators (top, fixed 140px, collapsible)
- Moves (middle, flex-1, scrollable)
- Chat (bottom, max 40% height, collapsible)

Each section has a header with icon + title + count + collapse button.

### 5. Mobile Bottom Action Bar (redesigned)

**Files:** `src/components/game/BottomActionBar.tsx`

- 4 tabs: Nước đi | Chat | Xem | Thêm
- Drag handle visual
- Glass-panel with backdrop-blur
- Drawer slides up from bottom with rounded top
- Each section: header + scrollable content

### 6. Tournament Page (polish)

**Files:** `src/app/tournament/[tournamentId]/page.tsx`

**Match flow (already implemented):**
- 2-step claim: player1 claims → READY, player2 claims → STARTED + gameId
- This works correctly (verified)

**Polish needed:**
- MatchCard: better visual hierarchy
- Standings: better layout
- "Đang chờ X vào" badge for waiting state

### 7. P0 Bug Fixes (from QA report)

**Bug 1: Player identity state split across 2 localStorage keys**
- `co_tuong_player` and `playerName` drift out of sync
- **Fix:** Single source of truth. Remove `playerName`, use only `co_tuong_player` (or rename to single key).

**Bug 2: Initial render shows all CTAs disabled**
- `Tạo phòng mới`, `Nhập mã`, `Tạo giải đấu` all start disabled
- **Fix:** Show enabled state, just check `needsName` for requiring name (not entire `player` object)

**Bug 3: No copy confirmation toast**
- `Sao chép link` button has no feedback
- **Fix:** Toast notification "Đã sao chép!" with auto-dismiss

**Bug 4: Welcome dialog language defaults to Vietnamese**
- When page is EN, welcome dialog still shows VI
- **Fix:** Sync welcome dialog language to `language` state

### 8. SEO

- Each game room has unique OG image (with player names, ELO)
- Tournament pages have proper meta
- Sitemap includes tournament URLs
- Structured data (JSON-LD) for game + tournament

### 9. E2E 8-Player Tournament Test

**Files:** `docs/superpowers/notes/e2e-8p-test.md` + automated test script

**Flow:**
1. Create 8 players (Playwright contexts)
2. Create tournament
3. All 8 join
4. Host starts
5. Verify 28 matches generated
6. For each match, 2 of the 8 players play a real game (each makes ~30 moves)
7. Verify match.status = COMPLETED, stats updated
8. After all 28, verify standings, champion
9. Take screenshots at each phase

**Acceptance criteria:**
- All 28 matches complete successfully
- Final standings reflect wins/losses/draws
- Champion is correctly identified
- No console errors
- Mobile + desktop UI looks polished

## Phases

### Phase 1: Foundation + Game Page (3h)
- Player.tsx with new ID sync fix
- 2D Board with verified 500ms FLIP animation, from-position highlight
- 3D Board with better camera, grid lines, domed pieces
- Game page layout: bigger board, player panels matching width
- Sidebar without tabs
- Mobile bottom action bar with tabs

### Phase 2: Tournament + Polish (1.5h)
- Tournament page MatchCard polish
- P0 bug fixes (player ID sync, disabled CTAs, copy toast, welcome language)
- SEO meta tags

### Phase 3: E2E Test (continuous, 6h)
- Write Playwright test script
- Run 8-player tournament full E2E
- Verify all 28 matches complete, final standings correct
- Take screenshots

### Phase 4: Deploy + Verify (0.5h)
- Build, push, deploy
- Visual verify on production

## Tech Stack

- Next.js 16.2 + React 19
- Tailwind 4
- three.js + @react-three/fiber + @react-three/drei (existing)
- Mongoose + MongoDB (existing)
- SWR (existing)

## File Map

### Modify
- `src/components/game/Board.tsx` (2D board with FLIP animation)
- `src/components/game/Board3D.tsx` (3D board polish)
- `src/components/game/GameSidebar.tsx` (no tabs)
- `src/components/game/BottomActionBar.tsx` (redesigned)
- `src/components/game/PlayerPanel.tsx` (bigger, with captured)
- `src/components/game/GameResult.tsx` (polish)
- `src/app/game/[roomId]/page.tsx` (layout overhaul)
- `src/app/tournament/[tournamentId]/page.tsx` (polish)
- `src/app/page.tsx` (CTA enabled state)
- `src/hooks/usePlayer.ts` (single ID source)
- `src/hooks/useI18n.ts` (welcome dialog language sync)
- `src/app/layout.tsx` (SEO meta)
- `src/app/globals.css` (toast styles, fixes)

### Create
- `src/components/ui/Toast.tsx` (toast notification)
- `docs/superpowers/notes/e2e-8p-test.md` (E2E test plan)

## Acceptance Criteria

- 2D board: 500ms piece movement animation, clear from-position highlight
- 3D board: full board visible, polished pieces, proper shadows
- Game page: board matches player info width, sidebar shows all sections
- Mobile: bottom tabs work, safe-area handled
- P0 bugs: all fixed
- 8-player tournament: completes with correct final standings
- Lighthouse score: Performance ≥ 85, Accessibility ≥ 90
- No console errors on any page

## Open Questions (will resolve during execution)

1. Should 3D board's shadows be on by default (affects perf on mobile)?
2. ELO update on tournament matches (currently host only)?
3. Tournament chat between participants?
4. Replay/timeline feature for finished matches?

These are out of scope for this round — will be tracked separately.
