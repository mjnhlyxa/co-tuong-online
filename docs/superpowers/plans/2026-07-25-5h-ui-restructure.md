# 5h UI/UX Restructure — co-tuong-online

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive UI/UX restructure to bring co-tuong-online to commercial-grade quality: fix critical bugs, redesign the game sidebar (moves/chat/spectators), polish captured pieces display, and add proper mobile experience. Target: 5 hours of focused work.

**Architecture:** Build on existing design system (`globals.css` tokens). Add a global `cursor: pointer` rule for buttons. Replace emoji-based sidebars with proper icon components. Use Canvas-rendered textures for all Chinese character displays. Add mobile-first responsive layouts.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, three.js (existing 3D), Mongoose.

---

## File Map

### Modify
- `src/app/globals.css` — add cursor:pointer for buttons, safe-area-inset, focus styles
- `src/components/game/CapturedPieces.tsx` — fix character rendering, hide empty, use Canvas texture
- `src/components/game/PlayerPanel.tsx` — better clock display, captured pieces with real chars
- `src/components/game/GameSidebar.tsx` — full redesign
- `src/components/game/ChatPanel.tsx` — modern chat with avatars
- `src/components/game/MoveHistory.tsx` — proper move pair display with current-move highlight
- `src/components/game/SpectatorList.tsx` — compact list with online dot
- `src/components/game/BottomActionBar.tsx` — better tab styling, fixed cursor
- `src/components/game/TakebackModal.tsx` — polish
- `src/components/game/GameResult.tsx` — polish
- `src/app/game/[roomId]/page.tsx` — fix the role modal, integrate everything
- `src/components/ui/Button.tsx` — ensure pointer
- `src/components/ui/Toggle.tsx` — ensure pointer
- `src/components/ui/Modal.tsx` — focus trap

### Create
- `src/components/ui/Icon.tsx` — simple SVG icon system (move, chat, eye, more, send, copy, share)
- `src/components/ui/Avatar.tsx` — gradient avatar with initial
- `src/components/ui/Tooltip.tsx` — small tooltip
- `src/components/game/IconButton.tsx` — better icon-only button (already exists? check)
- `src/components/game/CapturedPiecesCanvas.tsx` — Canvas-rendered captured pieces

---

## Hour 1: Foundation fixes (Bugs A, B, C partial)

### Task 1.1: Global cursor:pointer + safe-area

**Files:**
- Modify: `src/app/globals.css`

- [ ] Add to end of globals.css:
```css
/* ─── Clickable affordance ─── */
button:not(:disabled),
[role="button"]:not([aria-disabled="true"]),
a[href],
.cursor-pointer {
  cursor: pointer;
}

button:disabled,
[role="button"][aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Safe area for mobile */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.safe-top {
  padding-top: env(safe-area-inset-top, 0);
}

/* Better focus rings */
button:focus-visible,
a:focus-visible,
[role="tab"]:focus-visible,
input:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}
```

### Task 1.2: Icon system

**Files:**
- Create: `src/components/ui/Icon.tsx`

- [ ] Create `src/components/ui/Icon.tsx`:
```tsx
'use client'
import { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export type IconName =
  | 'scroll' | 'chat' | 'eye' | 'more' | 'send' | 'copy' | 'share'
  | 'back' | 'close' | 'check' | 'arrow-right' | 'arrow-left'
  | 'trophy' | 'crown' | 'flag' | 'undo' | 'cog' | 'refresh' | 'plus'
  | 'pause' | 'play' | 'lightning' | 'fire' | 'star'

const PATHS: Record<IconName, string> = {
  scroll: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 4h10M7 11h10M7 15h6',
  chat: 'M21 12a8 8 0 11-3-6.2L21 4l-1 4.2A8 8 0 0121 12z',
  eye: 'M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  copy: 'M9 9h10v10H9V9zm-4 6V5a2 2 0 012-2h10',
  share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  back: 'M19 12H5M12 19l-7-7 7-7',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M5 13l4 4L19 7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 11-10 0V4zM17 4h3a3 3 0 010 6h-3M7 4H4a3 3 0 000 6h3',
  crown: 'M2 20h20L18 8l-4 4-2-6-2 6-4-4-4 12z',
  flag: 'M4 22V4l8 4-8 4',
  undo: 'M3 7v6h6M3 13a9 9 0 1018 0 9 9 0 00-18 0z',
  cog: 'M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2-1 1-3-3-1-1-2-3 1-1-2-3 1-1-2 1-3 3-1 1-2 3 1 1-2 3-1 1 2-1 3 3 1 1 2-1 3',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  plus: 'M12 5v14M5 12h14',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  play: 'M5 3l14 9-14 9V3z',
  lightning: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  fire: 'M12 2c2 4 4 6 4 10a4 4 0 11-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-9z',
  star: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z',
}

export default function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
```

### Task 1.3: Avatar component

**Files:**
- Create: `src/components/ui/Avatar.tsx`

- [ ] Create `src/components/ui/Avatar.tsx`:
```tsx
'use client'
import { clsx } from 'clsx'

interface AvatarProps {
  name: string
  color?: 'red' | 'black' | 'gold' | 'auto'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const GRADIENTS = [
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-sky-400 to-sky-600',
  'from-orange-400 to-orange-600',
]

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!
}

const SIZE = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export default function Avatar({ name, color = 'auto', size = 'md', className }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const gradient = color === 'auto' ? hashColor(name) : color === 'red' ? 'from-rose-500 to-rose-700' : color === 'black' ? 'from-slate-500 to-slate-700' : 'from-amber-400 to-amber-600'
  return (
    <div className={clsx(
      'inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shrink-0 ring-2 ring-[var(--c-surface)]',
      gradient,
      SIZE[size],
      className
    )}>
      {initial}
    </div>
  )
}
```

### Task 1.4: Fix CapturedPieces (the "?" bug)

**Files:**
- Modify: `src/components/game/CapturedPieces.tsx`

- [ ] Rewrite `CapturedPieces.tsx`:
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

const PIECE_CHARS: Record<string, string> = {
  rk: '帥', ra: '仕', re: '相', rh: '俥', rr: '馬', rc: '炮', rp: '兵',
  bk: '將', ba: '士', be: '象', bh: '車', br: '傌', bc: '砲', bp: '卒',
}

const PIECE_VALUE: Record<string, number> = {
  k: 100, a: 20, e: 20, h: 90, r: 40, c: 45, p: 10,
}

interface CapturedPiecesProps {
  codes: string[]
  color: 'red' | 'black'
  size?: 'sm' | 'md' | 'lg'
}

export default function CapturedPieces({ codes, color, size = 'md' }: CapturedPiecesProps) {
  if (!codes || codes.length === 0) return null

  const sorted = [...codes].sort((a, b) => (PIECE_VALUE[b[1]!] ?? 0) - (PIECE_VALUE[a[1]!] ?? 0))
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[11px]' : size === 'lg' ? 'w-7 h-7 text-base' : 'w-6 h-6 text-[13px]'

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {sorted.map((code, i) => (
        <PieceToken key={i} code={code} color={color} className={sizeClass} />
      ))}
    </div>
  )
}

function PieceToken({ code, color, className }: { code: string; color: 'red' | 'black'; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const char = PIECE_CHARS[code] || '?'

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = 48
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = color === 'red' ? '#dc2626' : '#1a1f2e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${size * 0.7}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Heiti SC", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif`
    ctx.fillText(char, size / 2, size / 2)
  }, [char, color])

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full opacity-60 ${className}`}
      style={{
        background: color === 'red' ? '#fde0d9' : '#2a2f3e',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
      title={char}
    >
      <canvas ref={ref} className="w-full h-full" style={{ imageRendering: 'auto' }} />
    </span>
  )
}
```

### Task 1.5: Build and verify foundation

- [ ] Run `MONGODB_URI="mongodb://localhost:27017/co-tuong-online" NEXT_PUBLIC_SITE_URL="http://localhost:3000" npm run build`
- [ ] Expected: "Compiled successfully"

---

## Hour 2: Game sidebar redesign (Bug C)

### Task 2.1: Redesign GameSidebar with proper tabs

**Files:**
- Modify: `src/components/game/GameSidebar.tsx`

- [ ] Rewrite as a comprehensive modern sidebar with sticky header, scrollable middle, optional footer:
  - Use new `Icon` component (no emoji)
  - Use new `Avatar` component for chat
  - Sticky tab header that stays visible while scrolling
  - Visual indicators for active tab (accent line + bg)
  - Better move notation formatting (with hover effect)
  - Better chat with timestamp on hover, mute indicator
  - Spectators with online dot

### Task 2.2: Redesign MoveHistory

**Files:**
- Modify: `src/components/game/MoveHistory.tsx`

- [ ] New design: monospace notation, current-move highlight (accent bg), pair layout (red+black in row), scroll-snap, last-move auto-scroll

### Task 2.3: Redesign ChatPanel

**Files:**
- Modify: `src/components/game/ChatPanel.tsx`

- [ ] New design:
  - Avatar for each message
  - Own messages right-aligned
  - Timestamp on hover only
  - Mute button (host only) on hover
  - Auto-scroll to bottom
  - Input fixed at bottom

### Task 2.4: Redesign SpectatorList

**Files:**
- Modify: `src/components/game/SpectatorList.tsx`

- [ ] New design:
  - Avatar + name + online dot
  - Better empty state
  - Smooth list

### Task 2.5: Build and verify

- [ ] Build OK
- [ ] Take screenshot to verify visually

---

## Hour 3: Player panels, captured pieces, modals (Bug B + polish)

### Task 3.1: Redesign PlayerPanel

**Files:**
- Modify: `src/components/game/PlayerPanel.tsx`

- [ ] New design:
  - Avatar + name + ELO badge + tier icon
  - Captured pieces in main row (not separate)
  - Big clock timer (right-aligned)
  - "Turn" indicator with subtle pulse
  - "Thắng/Thua/Hòa" result badge when finished

### Task 3.2: Polish GameResult modal

**Files:**
- Modify: `src/components/game/GameResult.tsx`

- [ ] Use new `Icon` for trophy/medal
  - Larger trophy icon
  - Better typography
  - Score breakdown (if applicable)

### Task 3.3: Polish Takeback modal

**Files:**
- Modify: `src/components/game/TakebackModal.tsx`

- [ ] Cleaner layout, icon, better typography

### Task 3.4: Fix Game page role modal

**Files:**
- Modify: `src/app/game/[roomId]/page.tsx`

- [ ] Replace emoji icons in role selection modal with `Icon` component
- [ ] Better typography

---

## Hour 4: Mobile + responsive + BottomActionBar

### Task 4.1: Redesign BottomActionBar

**Files:**
- Modify: `src/components/game/BottomActionBar.tsx`

- [ ] New design:
  - Use `Icon` component (not emoji)
  - Active state with accent bg + scale
  - Safe-area-inset bottom
  - Badge for unread (chat count)
  - Better drawer with rounded top + drag handle visual

### Task 4.2: Mobile game page

**Files:**
- Modify: `src/app/game/[roomId]/page.tsx`

- [ ] Mobile-first:
  - Sticky board on scroll
  - Tabs for moves/chat/spectators above bottom bar
  - Better opponent/my panel compact on mobile
  - Touch targets ≥ 44px

### Task 4.3: Mobile lobby

**Files:**
- Modify: `src/app/page.tsx`

- [ ] Mobile:
  - Hero buttons full-width stack
  - Stats grid responsive
  - Tournament/rooms/leaderboard stack better

### Task 4.4: Mobile tournament page

**Files:**
- Modify: `src/app/tournament/[tournamentId]/page.tsx`

- [ ] Mobile:
  - Tabs scroll horizontally
  - Schedule cards stack
  - Standings table compact

---

## Hour 5: Final polish + deploy + verify

### Task 5.1: Final UI polish

- [ ] Scan for `cursor: not-allowed` on disabled buttons
- [ ] Add focus-visible to all interactive elements
- [ ] Verify all emoji icons replaced with `Icon`
- [ ] Verify mobile safe-area on all bottom bars
- [ ] Verify color contrast meets WCAG AA

### Task 5.2: Build, push, deploy

- [ ] `npm run build` — must pass
- [ ] Commit with clear message
- [ ] Push to main
- [ ] Wait for Vercel deploy to READY

### Task 5.3: Visual verification

- [ ] Navigate to https://co-tuong-online.vercel.app/
- [ ] Take screenshot of lobby (desktop + mobile)
- [ ] Navigate to a game, take screenshot
- [ ] Test on mobile viewport
- [ ] Check: cursor on buttons, captured pieces show real chars, modals look good
- [ ] Fix any visible bugs

### Task 5.4: Final report

- [ ] Write summary of what changed
- [ ] Note any remaining issues for future work

---

## Self-Review Checklist

- [x] All user-reported bugs mapped to tasks
- [x] No placeholders
- [x] Type consistency
- [x] Files mapped
- [x] Time-budget realistic (5h)
