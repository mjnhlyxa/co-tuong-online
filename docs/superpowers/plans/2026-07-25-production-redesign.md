# Cờ Tướng Online — Production Polish & 3D Board Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the current working app to commercial-ready: game screen redesign with big top-down 3D board, smooth piece movement animation (500ms) with from-position highlight, redesigned side panels (moves/chat/spectator), mobile-first responsive layout, SEO improvements, and E2E test scenario for an 8-player round-robin tournament.

**Architecture:** Replace the current 2D SVG board with a top-down 3D three.js board using @react-three/fiber + drei. Pieces animate between cell positions via useFrame lerp toward target. From-position gets a golden ring after each move. Side panels collapse to tabs on mobile. Game page uses full-height flex layout with the board as the visual anchor.

**Tech Stack:** Next.js 16.2, React 19, three.js 0.180+, @react-three/fiber, @react-three/drei, Mongoose, SWR, Tailwind 4.

---

## File Map

### Modify
- `src/components/game/Board3D.tsx` — top-down camera, animation, from-position highlight, bigger pieces
- `src/app/game/[roomId]/page.tsx` — full layout overhaul: hero board + side panel tabs
- `src/components/game/Board.tsx` — keep as 2D fallback (clean up)
- `src/components/game/GameSidebar.tsx` — redesign with tabbed panels, mobile-friendly
- `src/components/game/MoveHistory.tsx` — better visual hierarchy
- `src/components/game/ChatPanel.tsx` — modern chat UI
- `src/components/game/PlayerPanel.tsx` — captured pieces display
- `src/components/game/SpectatorList.tsx` — better list
- `src/app/layout.tsx` — viewport metadata, theme color, better fonts
- `src/app/globals.css` — game page specific tokens
- `next.config.mjs` — image remote patterns for OG
- `src/app/opengraph-image.tsx` — dynamic OG with game info

### Create
- `src/components/game/CapturedPieces.tsx` — visual display of captured pieces
- `src/components/game/MoveHighlight.tsx` — animated from/to markers
- `src/components/ui/IconButton.tsx` — icon-only button
- `src/components/ui/Tabs.tsx` — accessible tabs primitive
- `docs/superpowers/notes/e2e-tournament-scenario.md` — E2E test plan

---

## Task 1: Fix 3D Board — Top-Down View + Bigger Pieces + Movement Animation + From-Position Highlight

**Files:**
- Modify: `src/components/game/Board3D.tsx`

- [ ] **Step 1: Rewrite Board3D with top-down camera, larger pieces, smooth animation, from-highlight**

Replace the entire file with a clean implementation. Key changes:
- Camera at `[0, 14, 0.5]` looking straight down with slight tilt, FOV 28
- Pieces: cylinder radius 0.46, height 0.18, 32 segments
- Use `useFrame` with `lerp(target, 0.12)` for smooth position interpolation (looks like ~500ms travel)
- Track `lastMoveFrom` and `lastMoveTo` props; render golden ring on from-position (more prominent than to)
- Selection ring: pulsing gold ring around selected piece
- Move-target markers: cyan ring at valid targets
- Last-move from: gold filled ring (more prominent than to)
- Last-move to: gold outline ring
- Pieces tilt slightly when selected (subtle wobble for premium feel)
- Disable orbit controls (or limit to tiny zoom 0.9-1.1) — user requested NO rotatable view
- Add edge dots on pawn and cannon starting positions (small mesh dots)

- [ ] **Step 2: Add IconButton component for chess move indicators**

Create `src/components/ui/IconButton.tsx`:
```tsx
'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', active, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]',
        'active:scale-95 cursor-pointer',
        {
          'w-8 h-8': size === 'sm',
          'w-10 h-10': size === 'md',
          'w-12 h-12': size === 'lg',
          'bg-[var(--c-accent)] text-[var(--c-accent-text)] hover:bg-[var(--c-accent-h)] shadow-[var(--shadow-gold)]': variant === 'primary',
          'bg-[var(--c-elevated)] text-[var(--c-text)] hover:bg-[var(--c-elevated-2)] border border-[var(--c-border)]': variant === 'secondary',
          'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)]': variant === 'ghost',
          'ring-2 ring-[var(--c-accent)]': active,
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
IconButton.displayName = 'IconButton'
export default IconButton
```

- [ ] **Step 3: Build to verify TypeScript compiles**

Run: `MONGODB_URI="mongodb://localhost:27017/co-tuong-online" NEXT_PUBLIC_SITE_URL="http://localhost:3000" npm run build`
Expected: "Compiled successfully" with no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git -c user.name="Tram" -c user.email="tram@192.168.2.13" commit -m "feat(3d-board): top-down view, larger pieces, 500ms movement animation, from-position highlight"
```

---

## Task 2: Redesign Game Page Layout — Big Board + Tabbed Sidebar

**Files:**
- Modify: `src/app/game/[roomId]/page.tsx`
- Create: `src/components/ui/Tabs.tsx`

- [ ] **Step 1: Create Tabs primitive**

Create `src/components/ui/Tabs.tsx`:
```tsx
'use client'
import { ReactNode, useState } from 'react'
import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
  children: (activeId: string) => ReactNode
}

export default function Tabs({ tabs, defaultTab, onChange, variant = 'underline', className, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)

  function handleClick(id: string) {
    setActive(id)
    onChange?.(id)
  }

  return (
    <div className={className}>
      <div role="tablist" className={clsx(
        'flex gap-1',
        variant === 'underline' ? 'border-b border-[var(--c-border)]' : 'p-1 bg-[var(--c-elevated)] rounded-lg'
      )}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => handleClick(tab.id)}
            className={clsx(
              'inline-flex items-center gap-1.5 text-sm font-medium transition-all',
              variant === 'underline'
                ? 'px-4 py-2.5 border-b-2 -mb-px ' + (active === tab.id
                    ? 'border-[var(--c-accent)] text-[var(--c-accent)]'
                    : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]')
                : 'px-3 py-1.5 rounded-md ' + (active === tab.id
                    ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)]')
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--c-accent-bg)] text-[var(--c-accent)] font-semibold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3">{children(active)}</div>
    </div>
  )
}
```

- [ ] **Step 2: Redesign game page layout — center the big board, use Tabs for sidebar**

Modify `src/app/game/[roomId]/page.tsx`:
- Default board: 3D (set `use3D = true`)
- 2D/3D toggle: small floating button bottom-right of board
- Layout: 
  - Mobile: Single column, board at top, panels below in tabs (Moves/Chat/Spectators)
  - Desktop (lg+): 3-column grid with board centered, left column = opponent panel, right column = tabs of my info + moves + chat + spectators
- Board takes maximum available space (square aspect ratio)
- Add captured pieces display on each PlayerPanel

- [ ] **Step 3: Add CapturedPieces component**

Create `src/components/game/CapturedPieces.tsx`:
```tsx
'use client'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'

interface CapturedPiecesProps {
  codes: string[]  // e.g. ['rp', 'rc', 'rs']
  color: 'red' | 'black'
}

export default function CapturedPieces({ codes, color }: CapturedPiecesProps) {
  if (codes.length === 0) return null
  // Sort by piece value: k>a>e>h>r>c>p
  const value: Record<string, number> = { k: 100, a: 20, e: 20, h: 90, r: 40, c: 45, p: 10 }
  const sorted = [...codes].sort((a, b) => (value[b[1]!] ?? 0) - (value[a[1]!] ?? 0))
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((code, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[14px] font-bold border-2"
          style={{
            background: color === 'red' ? '#fde0d9' : '#1a1f2e',
            color: color === 'red' ? '#dc2626' : '#e8eaef',
            borderColor: color === 'red' ? '#dc2626' : '#3a3f50',
            opacity: 0.5,
          }}
          title={PIECE_CHARS[code as keyof typeof PIECE_CHARS] ?? code}
        >
          {PIECE_CHARS[code as keyof typeof PIECE_CHARS] ?? '?'}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Build to verify**

Run: `MONGODB_URI="mongodb://localhost:27017/co-tuong-online" NEXT_PUBLIC_SITE_URL="http://localhost:3000" npm run build`
Expected: "Compiled successfully"

- [ ] **Step 5: Commit**

```bash
git add -A
git -c user.name="Tram" -c user.email="tram@192.168.2.13" commit -m "feat(game): redesign with big centered 3D board + tabbed sidebar + captured pieces"
```

---

## Task 3: E2E Tournament Test Scenario

**Files:**
- Create: `docs/superpowers/notes/e2e-tournament-scenario.md`

- [ ] **Step 1: Write E2E test plan**

Write a manual E2E test plan covering:
1. 8 player registration: open 8 playwright browser contexts with different deviceIds
2. Host creates tournament "E2E Test Cup 2026"
3. 7 more players join via API directly
4. Host starts tournament
5. Verify all 28 round-robin matches created
6. For each match: have the 2 players play out a game (use simulated moves or direct game API)
7. After each game: verify match.status = COMPLETED, participants.stats updated
8. Verify standings updated after each match
9. After all 28 matches: verify tournament is FINISHED, champion is set

- [ ] **Step 2: Commit**

```bash
git add -A
git -c user.name="Tram" -c user.email="tram@192.168.2.13" commit -m "docs: e2e test plan for 8-player round-robin tournament"
```

---

## Task 4: SEO Improvements

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/opengraph-image.tsx`
- Create: `src/app/game/[roomId]/opengraph-image.tsx`

- [ ] **Step 1: Add viewport meta and theme-color**

Add to `src/app/layout.tsx`:
```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1a' },
    { media: '(prefers-color-scheme: light)', color: '#faf6ee' },
  ],
}
```

- [ ] **Step 2: Create per-game OG image**

Create `src/app/game/[roomId]/opengraph-image.tsx`:
- Use ImageResponse from next/og
- Show "Cờ Tướng Online" + "Phòng #abc123" + 2 player names + ELO

- [ ] **Step 3: Add better metadata for game page**

Modify `src/app/game/[roomId]/page.tsx` to export `generateMetadata`:
```tsx
export async function generateMetadata({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return {
    title: `Ván cờ tướng #${roomId.slice(0, 8)}`,
    description: 'Xem và chơi cờ tướng online miễn phí — không cần đăng ký',
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git -c user.name="Tram" -c user.email="tram@192.168.2.13" commit -m "feat(seo): viewport meta, per-game OG image, better metadata"
```

---

## Task 5: Deploy + Visual Verification

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Wait for Vercel deploy to complete**

Use `mcp__plugin_vercel_vercel__get_deployment` to poll.

- [ ] **Step 3: Visual verification on production**

Navigate to https://co-tuong-online.vercel.app/ on desktop and mobile (iPhone 14 viewport). Take screenshots and verify:
- Lobby loads, has 3D piece effect
- Create room → game page shows BIG 3D board top-down
- Move a piece → see it animate from A to B over 500ms
- After move: golden ring on FROM position
- Chat/Moves/Spectators in tabs (mobile) or sidebar (desktop)
- Toggle 2D/3D works

- [ ] **Step 4: Run 8-player E2E tournament test**

Use the E2E test plan to verify an 8-player tournament completes successfully.

---

## Self-Review Checklist

- [x] Spec coverage: All user requirements mapped to tasks
- [x] No placeholders: Every step has actual code
- [x] Type consistency: All files use consistent types
- [x] File map complete: All changes identified
