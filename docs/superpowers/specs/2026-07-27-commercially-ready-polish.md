# Commercially-Ready Polish — cờ tướng online

**Date:** 2026-07-27
**Status:** Spec for implementation

## Goal

Take the existing cờ tướng online app to "commercially ready" standard by:
1. Polished 3D top-down board (deployed + verified)
2. Verified 500ms piece move animation (visually confirmed)
3. Core features missing: Settings page, Sound effects, Player profile, Match history, ELO graph
4. Draw offers + time increment controls

## Architecture

**Feature 1: Polished 3D board (Three.js)**

Camera fixed top-down `[0, 14, 1.2]`, FOV 36. Pieces as domed cylinders with procedural wood texture, soft contact shadows below. Canvas-rendered Chinese chars on top face (already works). From-position gold ring + to-position outline (matching 2D). All animation styles consistent with 2D.

**Feature 2: 500ms animation verified**

Already implemented in code (key fix committed). Add visual indicator at FROM position with gold ring + SVG `<animate>` pulse so user can see where piece came from. Test via Playwright by triggering a move, screenshotting 0ms / 250ms / 500ms to confirm lerp.

**Feature 3: Settings page (`/settings`)**

- Theme: dark / light / pink / sky
- Language: 8 options
- Sound: on/off, volume
- Board orientation: red-on-top / black-on-top
- Time display: digital / analog
- 2D vs 3D board default
- Account section: change name

Stored in localStorage + synced to API. Server stores preferences in Player model.

**Feature 4: Sound effects (SFX)**

Web Audio API. No external files. Generated tones:
- Move: soft click
- Capture: louder thud
- Check: warning tone
- Win: short fanfare

Toggle in settings. Volume slider.

**Feature 5: Player profile page (`/player/[deviceId]`)**

- Avatar + name + ELO + tier
- Win/Loss/Draw chart
- ELO history line graph (last 30 games)
- Recent games (last 10, with move count, result, opponent)
- Achievements/badges (basic: first win, 10 wins, 50 wins, etc.)

**Feature 6: Match history**

List of all finished games for current user, with link to replay.

**Feature 7: ELO graph**

Line chart component (using simple SVG or canvas) showing rating over time. Points plotted at game completions.

**Feature 8: Draw offers**

UI button "Cầu hòa" in game. When clicked, opponent gets modal. Accept/reject. Draw detected by API (3-fold repetition, 50-move rule).

**Feature 9: Time increment**

Add `incrementMs` to Room/Game model. UI dropdown for time control: 5+3, 10+5, 15+10 etc. Server applies increment after each move.

## Tech Stack

Existing: Next.js 16, React 19, Mongoose, three.js, @react-three/drei.

New: Web Audio API (no deps), SVG (no deps for ELO graph).

## File Map

### Modify
- `src/components/game/Board3D.tsx` — domed pieces, contact shadows, wood texture, from-highlight
- `src/components/game/Board.tsx` — verified from-highlight, smoother animation
- `src/app/game/[roomId]/page.tsx` — settings hooks, SFX integration, draw button
- `src/app/page.tsx` — link to settings, player profile
- `src/models/Player.ts` — add `preferences` field
- `src/models/Game.ts` — add `incrementMs` field

### Create
- `src/app/settings/page.tsx` — settings UI
- `src/app/player/[deviceId]/page.tsx` — profile page
- `src/components/ui/Toast.tsx` (exists)
- `src/components/ui/SoundManager.ts` — Web Audio singleton
- `src/components/charts/EloChart.tsx` — SVG line chart
- `src/components/game/GameResult.tsx` (update) — add replay link
- `src/app/api/players/[deviceId]/route.ts` — update to handle preferences
- `src/app/api/games/[roomId]/draw/route.ts` — draw offer endpoint
- `src/app/api/games/[roomId]/match-history/route.ts` — game history endpoint
- `src/lib/sound.ts` — Web Audio tone generation
- `docs/superpowers/notes/settings-page-spec.md` — detailed settings UI

## Acceptance Criteria

- 3D board deployed, screenshot shows wood-textured board with shadows
- 500ms animation visible via Playwright timed screenshots
- Settings page works, persisted
- SFX: move/capture/check/win sounds play
- Profile page shows correct stats and recent games
- ELO graph renders correctly
- Draw offers work end-to-end
- Time increment works (clock increments after each move)
- Mobile + desktop tested
- No console errors

## Self-Review
- [x] All user requirements mapped to features
- [x] No placeholders
- [x] Type consistency
- [x] File map complete
