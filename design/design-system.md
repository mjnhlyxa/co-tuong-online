# co-tuong-online — Design System

## Colors

### Core Palette
```css
:root {
  /* Backgrounds */
  --bg-page: #12121a;           /* Very dark background — easy on eyes */
  --bg-surface: #1a1d27;         /* Card/panel backgrounds */
  --bg-elevated: #232638;        /* Modals, dropdowns */

  /* Board */
  --board-light: #d4b896;        /* Light square */
  --board-dark: #c4a876;         /* Dark square */
  --board-river: #3d7a9e;       /* River — blue */
  --board-palace: #b89860;      /* Palace highlight */

  /* Primary — deep blue */
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #3b82f6;

  /* Accent — punchy orange for CTAs */
  --accent: #f97316;
  --accent-hover: #ea580c;

  /* Semantic */
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;

  /* Piece Colors */
  --piece-red-bg: #dc2626;
  --piece-red-char: #ffffff;
  --piece-black-bg: #1f2937;
  --piece-black-char: #fbbf24;

  /* Text */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Board Overlay */
  --highlight-selected: rgba(251, 191, 36, 0.5);   /* Gold — selected piece */
  --highlight-valid: rgba(34, 197, 94, 0.6);      /* Green — valid move dot */
  --highlight-check: rgba(239, 68, 68, 0.6);       /* Red — check warning */
  --highlight-last-move: rgba(251, 191, 36, 0.3);  /* Amber — last move highlight */
}
```

### Typography
```css
:root {
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Outfit', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Scale */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
}
```

### Spacing
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
}
```

### Border Radius
```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

### Shadows
```css
:root {
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-piece: 0 3px 6px rgba(0, 0, 0, 0.5);
}
```

### Breakpoints
```css
:root {
  --bp-mobile: 375px;
  --bp-tablet: 640px;
  --bp-desktop: 1024px;
}
```

---

## Component Design Tokens

### Button

| Variant | BG | Text | Border | Use |
|---------|-----|------|--------|-----|
| Primary | `--primary` | white | none | Main CTA |
| Accent | `--accent` | white | none | Important action |
| Secondary | transparent | `--text-secondary` | 1px `--text-muted` | Secondary action |
| Ghost | transparent | `--text-secondary` | none | Icon buttons |
| Danger | `--danger` | white | none | Destructive |

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| sm | 32px | 12px 16px | 14px |
| md | 40px | 12px 20px | 16px |
| lg | 48px | 16px 28px | 18px |

### Card
- Background: `--bg-surface`
- Border-radius: `--radius-lg`
- Shadow: `--shadow-card`
- Padding: `--space-4`

### Modal
- Background: `--bg-elevated`
- Border-radius: `--radius-xl`
- Shadow: `--shadow-modal`
- Max-width: 480px (sm), 640px (md)

### Input
- Background: `--bg-surface`
- Border: 1px solid `--text-muted`
- Focus border: `--primary`
- Border-radius: `--radius-md`
- Height: 40px (md), 32px (sm)
- Padding: 0 `--space-3`

### Badge
- Border-radius: `--radius-full`
- Padding: 2px 8px
- Font size: 12px
- Variants map to success/warning/danger/neutral semantic colors

### Piece Circle
- Size: 48px (desktop board), 36px (mobile board)
- Border-radius: `--radius-full`
- Shadow: `--shadow-piece`
- Character font size: 24px / 18px
- Font weight: 700
- Red piece: `--piece-red-bg` bg, white char, white border
- Black piece: `--piece-black-bg` bg, gold char, gold border

---

## Board Design Tokens

```css
:root {
  --board-size-desktop: 576px;   /* 64px per cell × 9 cols */
  --board-size-tablet: 432px;    /* 48px per cell × 9 cols */
  --board-size-mobile: 315px;     /* 35px per cell × 9 cols */
  --cell-size-desktop: 64px;
  --cell-size-tablet: 48px;
  --cell-size-mobile: 35px;
  --piece-size-desktop: 52px;
  --piece-size-mobile: 30px;
}
```

### Board Grid
- 9 columns × 10 rows displayed as 9×10
- CSS Grid: `grid-template-columns: repeat(9, 1fr)`
- Cell aspect ratio: 1:1 (square)
- River rows (row 4 and 5) filled with `--board-river` with transparency
- Palace corners marked with diagonal border lines

---

## Interaction States

### Piece — Interactive
- **Default**: normal piece with shadow
- **Hover** (my piece, my turn): scale 1.08, brighter shadow
- **Selected**: golden ring (`--highlight-selected` glow)
- **Dragging**: scale 1.1, opacity 0.9, higher z-index
- **Captured**: slides to captured area of opponent panel

### Board Cell — Valid Move
- Small green dot centered in cell (35% of cell width)
- Clickable: hover shows brighter green

### Player Panel — Current Turn
- Glowing left border in `--primary` color
- Pulsing green dot next to name
- Timer text in `--warning` if under 60s

### Move History Entry — Current
- Amber background highlight
- Expanded: shows full `from → to` notation

---

## Icon Library
- **Lucide Icons** (via CDN) — clean, consistent stroke icons
- Used for: copy, share, question mark, close, check, warning, timer
- Size: 20px for inline, 24px for standalone buttons

---

## Animations

| Animation | Duration | Easing | Use |
|-----------|---------|--------|-----|
| Fade-in | 200ms | ease-out | Modals opening |
| Scale-in | 250ms | ease-out | Piece selection |
| Slide-up | 300ms | ease-out | Move history entry |
| Pulse | 2s | ease-in-out | Turn indicator dot |
| Shake | 300ms | ease-in-out | Invalid move — board shakes horizontally 4px |

---

## Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```
