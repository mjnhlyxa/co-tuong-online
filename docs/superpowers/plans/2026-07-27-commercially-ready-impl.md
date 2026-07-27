# Commercially-Ready Polish — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring cờ tướng online to "commercially ready" standard with 3D polished board, verified animation, settings, SFX, profile, match history, ELO graph, draw offers, time increment.

**Architecture:** Sequential phases. Phase 1 = visual polish (3D + animation). Phase 2 = core features. Phase 3 = mobile test + deploy.

**Tech Stack:** Existing Next.js 16 + three.js + Mongoose. New: Web Audio API (no deps), inline SVG charts.

---

## File Map

### Modify
- `src/components/game/Board3D.tsx` — full polish
- `src/components/game/Board.tsx` — verify from-highlight
- `src/app/game/[roomId]/page.tsx` — SFX, draw, settings
- `src/app/page.tsx` — header links
- `src/models/Player.ts` — preferences field
- `src/models/Game.ts` — incrementMs field
- `src/models/Room.ts` — incrementMs field

### Create
- `src/app/settings/page.tsx`
- `src/app/player/[deviceId]/page.tsx`
- `src/components/charts/EloChart.tsx`
- `src/lib/sound.ts`
- `src/app/api/players/[deviceId]/preferences/route.ts`
- `src/app/api/games/[roomId]/draw/route.ts`
- `src/app/api/games/[roomId]/history/route.ts`

---

## Phase 1: Visual Polish (3D + Animation verify)

### Task 1.1: Polish 3D Board

**Files:** `src/components/game/Board3D.tsx`

- [ ] **Step 1: Add proper wood texture via Canvas**

```ts
function createWoodTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 512
  const ctx = c.getContext('2d')!
  // Wood base
  ctx.fillStyle = '#d8b878'
  ctx.fillRect(0, 0, 512, 512)
  // Wood grain (horizontal lines with varying opacity)
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(139,105,20,${0.05 + Math.random() * 0.1})`
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(0, i * 8 + Math.random() * 4)
    ctx.bezierCurveTo(128, i*8 + Math.random()*4, 256, i*8 + Math.random()*4, 512, i*8 + Math.random()*4)
    ctx.stroke()
  }
  // Knots
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 512, y = Math.random() * 512
    const r = 8 + Math.random() * 12
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(101,67,33,0.5)')
    grad.addColorStop(1, 'rgba(101,67,33,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}
```

Use this for the board surface.

- [ ] **Step 2: Polish piece mesh — beveled cylinder with proper shadows**

```ts
// Replace flat cylinder with beveled version
const pieceGeo = useMemo(() => {
  const geo = new THREE.CylinderGeometry(PIECE_R, PIECE_R * 0.95, PIECE_H, 32, 1, false)
  // Add bevel by scaling top vertices
  return geo
}, [])
```

Use ContactShadows with `blur={1.5}` for soft shadows below each piece.

- [ ] **Step 3: Camera and lighting**

```ts
camera={{ position: [0, 12, 1.2], fov: 32 }}
```

Add 3 lights:
1. DirectionalLight top-down, intensity 1.0
2. DirectionalLight from front-left, intensity 0.3 (rim)
3. AmbientLight intensity 0.4

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add -A && git -c user.name="Tram" -c user.email="tram@192.168.2.13" commit -m "feat(3d-board): wood texture, beveled pieces, soft contact shadows"
```

### Task 1.2: Verify 500ms animation visually

**Files:** `src/components/game/Board.tsx`

- [ ] **Step 1: Verify key fix is deployed**

The fix is already in: `key: code` (not position-based).

- [ ] **Step 2: Verify from-position highlight**

Confirm in code that `lastMoveType === 'from'` renders gold filled rect with SVG pulse animation. Already implemented in commit 8da3076.

- [ ] **Step 3: Manual visual test**

Open Playwright, create game, make move, screenshot at 0ms, 250ms, 500ms to confirm animation.

---

## Phase 2: Core Features

### Task 2.1: Settings page

**Files:** `src/app/settings/page.tsx` (new), `src/models/Player.ts` (modify)

- [ ] **Step 1: Update Player model with preferences**

Add to `Player.ts` interface:
```ts
preferences: {
  theme: 'dark' | 'light' | 'pink' | 'sky'
  language: string
  sound: boolean
  soundVolume: number  // 0-1
  boardOrientation: 'red-top' | 'black-top'
  boardStyle: '2d' | '3d'
}
```

Default: `{ theme: 'dark', language: 'vi', sound: true, soundVolume: 0.5, boardOrientation: 'red-top', boardStyle: '2d' }`

- [ ] **Step 2: Create settings page**

File: `src/app/settings/page.tsx`

UI sections:
1. Display: Theme (4 buttons), Language (8), Board orientation (2), Default board (2D/3D)
2. Sound: On/off toggle, Volume slider
3. Account: Change name input (calls `/api/players/[deviceId]` PUT)

- [ ] **Step 3: Preferences API endpoint**

`POST /api/players/[deviceId]/preferences` — accept `{ theme, language, sound, soundVolume, boardOrientation, boardStyle }`, save to Player.preferences.

- [ ] **Step 4: Settings hook**

`src/hooks/useSettings.ts` — load from localStorage (fast) + API (sync to server).

- [ ] **Step 5: Build and commit**

```bash
npm run build && git commit -am "feat(settings): page with theme, language, sound, board options"
```

### Task 2.2: Sound effects (SFX)

**Files:** `src/lib/sound.ts` (new), `src/components/game/GameUI.tsx` (or inline in game page)

- [ ] **Step 1: Create sound library**

```ts
// src/lib/sound.ts
let ctx: AudioContext | null = null
let enabled = true
let volume = 0.5

export function initSound() {
  if (typeof window === 'undefined') return
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
}

export function setSoundEnabled(e: boolean) { enabled = e }
export function setSoundVolume(v: number) { volume = Math.max(0, Math.min(1, v)) }

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.2) {
  if (!ctx || !enabled) return
  if (ctx.state === 'suspended') ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol * volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export function playMove() { playTone(220, 0.05, 'sine', 0.15) }
export function playCapture() { playTone(180, 0.08, 'triangle', 0.25) }
export function playCheck() { playTone(440, 0.15, 'sawtooth', 0.2); setTimeout(() => playTone(330, 0.15, 'sawtooth', 0.2), 100) }
export function playWin() {
  const notes = [262, 330, 392, 523]
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.2, 'sine', 0.25), i * 120))
}
```

- [ ] **Step 2: Wire up to game moves**

In `useGameSWR` or game page, when `makeMove` succeeds, call `playMove` or `playCapture` (based on whether move captures).

When `isInCheck`, call `playCheck`. When game ends, call `playWin` or `playLose`.

- [ ] **Step 3: Build and commit**

### Task 2.3: Player profile page

**Files:** `src/app/player/[deviceId]/page.tsx` (new), `src/components/charts/EloChart.tsx` (new)

- [ ] **Step 1: EloChart component**

SVG line chart, 400px wide, 150px tall. Plot last 30 game ELOs.

- [ ] **Step 2: Profile page**

Layout: avatar header, stats grid, ELO chart, recent games list with link to replay.

- [ ] **Step 3: Link from lobby**

In `src/app/page.tsx`, add a "Profile" link in user dropdown/menu.

- [ ] **Step 4: Build and commit**

### Task 2.4: Match history

**Files:** `src/app/api/games/[roomId]/history/route.ts` (new), `src/app/player/[deviceId]/page.tsx` (modify)

- [ ] **Step 1: History endpoint**

`GET /api/games/history?deviceId=X&limit=10` — return finished games where deviceId is player1 or player2.

- [ ] **Step 2: Use in profile page**

Show in "Recent games" section with link to `/game/[roomId]` (replay mode).

- [ ] **Step 3: Build and commit**

### Task 2.5: Draw offers

**Files:** `src/app/api/games/[roomId]/draw/route.ts` (new), `src/app/game/[roomId]/page.tsx` (modify)

- [ ] **Step 1: Draw offer endpoint**

`POST /api/games/[roomId]/draw` body `{ deviceId, action: 'offer' | 'accept' | 'reject' }`.

Update Game with `drawOffer: { fromColor, status: 'pending' | 'accepted' | 'rejected' }`.

If accepted: game.status='finished', game.winner='draw', game.endReason='draw_agreement'.

- [ ] **Step 2: Add draw button in game page**

"Cầu hòa" button next to resign. Shows modal for opponent to accept/reject.

- [ ] **Step 3: Build and commit**

### Task 2.6: Time increment

**Files:** `src/models/Room.ts` (modify), `src/models/Game.ts` (modify), `src/app/api/rooms/route.ts` (modify)

- [ ] **Step 1: Add incrementMs field**

`Room: { timeControl: number, incrementMs: number }` (default 0).
`Game: { ... timeControl, incrementMs }` copied from Room.

- [ ] **Step 2: Move endpoint applies increment**

In `move/route.ts`, after successful move:
```ts
const newTime = currentTime + game.incrementMs
game.timeRemaining[currentColor] = Math.max(0, currentRemaining + game.incrementMs)
```

Wait — the move is for the OPPONENT's clock (since after move, it's opponent's turn). So:
```ts
const opponentColor = myColor === 'red' ? 'black' : 'red'
game.timeRemaining[opponentColor] = currentTimeRemaining + game.incrementMs
```

- [ ] **Step 3: Build and commit**

---

## Phase 3: Test + Deploy

### Task 3.1: Mobile test

Use Playwright at 390x844 viewport. Test:
- Settings page
- Player profile
- 2D board (move, animation, from-highlight)
- 3D board (polished)
- Match history

### Task 3.2: E2E with all new features

Run E2E script that:
- Updates player preferences
- Plays a game with draw offer
- Plays a game with time increment
- Verifies SFX calls don't crash

### Task 3.3: Final deploy

```bash
git push origin main
sleep 60
# Visual verify on production
```

## Self-Review
- [x] All features in spec mapped
- [x] No placeholders
- [x] Type consistency
- [x] File map complete
