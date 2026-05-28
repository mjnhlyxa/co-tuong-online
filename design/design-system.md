# Design System — Cờ Tướng Online

Phong cách: **Dark, traditional-modern** — gợi lên bàn cờ gỗ và trà đá Việt Nam, nhưng clean và dễ đọc trên màn hình. Tránh flashy animations, ưu tiên clarity.

---

## Color Palette

```
Background (page)     #0f1117    Very dark navy — nền trang
Surface (cards)       #1a1d27    Dark blue-grey — panels, modals
Surface Raised        #242836    Slightly lighter — hover states, inputs
Border                #2e3347    Subtle separator

Text Primary          #e8eaf0    Off-white — headings, important text
Text Secondary        #7c8299    Muted grey — labels, timestamps
Text Disabled         #454a5e    Very muted — disabled states

Red Player            #e85d4a    Warm red — đỏ (traditional xiangqi red)
Red Player Light      #ff8577    Light red — highlights, hover
Black Player          #a0b0c8    Steel blue-grey — đen (rendered as blue-grey for contrast)
Black Player Light    #c8d5e8    Light version

Accent (action)       #4f9cf7    Bright blue — primary buttons, links, focus
Accent Hover          #6fb0ff    Lighter blue — hover state
Accent Subtle         #1d3557    Subtle blue bg — selected state

Success               #4caf70    Green — win, valid move confirmation
Warning               #f5a623    Amber — check warning, timer low
Error                 #e85d4a    Same as red — errors, resign

Board Background      #c8a96e    Warm tan — bàn cờ
Board Lines           #8b6914    Dark gold — đường kẻ
Board Highlight       rgba(79,156,247,0.35)   Blue-ish — selected piece
Board ValidMove       rgba(79,156,247,0.20)   Subtle blue dot — valid destination
Board LastMove        rgba(255,210,100,0.25)  Yellow-ish — last move highlight
Board Check           rgba(232,93,74,0.40)    Red glow — king in check
```

---

## Typography

```
Font Stack:
  Heading: "Outfit", "Inter", sans-serif
  Body:    "Inter", "SF Pro Text", system-ui, sans-serif
  Mono:    "JetBrains Mono", "Fira Code", monospace  (move notation)
  Piece:   "Noto Serif SC", serif  (chữ Hán trên quân cờ)
```

### Scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 32px | 700 | Page title, game over heading |
| `heading` | 24px | 600 | Section headings |
| `title` | 18px | 600 | Card titles, player names |
| `body` | 15px | 400 | Body text, descriptions |
| `label` | 13px | 500 | Labels, badges |
| `caption` | 12px | 400 | Timestamps, meta |
| `piece` | varies | 700 | Chữ trên quân cờ |

---

## Spacing (base: 4px)

```
xs:   4px
sm:   8px
md:  12px
lg:  16px
xl:  24px
2xl: 32px
3xl: 48px
4xl: 64px
```

---

## Border Radius

```
sm:   4px   — badges, small chips
md:   8px   — cards, inputs, pieces
lg:  12px   — modals, large cards
xl:  16px   — bottom sheets (mobile)
full: 9999px — avatars, pill buttons
```

---

## Shadows

```
card:   0 2px 8px rgba(0,0,0,0.4)
modal:  0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)
piece:  0 2px 4px rgba(0,0,0,0.5)         (quân cờ trên bàn)
piece-selected: 0 0 0 2px #4f9cf7, 0 4px 12px rgba(79,156,247,0.4)
```

---

## Breakpoints

```
mobile:  < 640px    (phones — bàn cờ chiếm full width)
tablet:  640–1023px (layout 1 cột nhưng rộng hơn)
desktop: ≥ 1024px   (layout 3 cột: player | board | history)
```

---

## Quân Cờ — Piece Design

Mỗi quân cờ là một hình tròn với:
- Viền double (outer ring + inner ring) — phong cách truyền thống
- Màu nền: đỏ (#e85d4a) cho quân đỏ, xanh đen (#2a3f5f) cho quân đen
- Chữ Hán ở giữa (white/light)
- Drop shadow nhẹ

**Ký hiệu quân cờ:**

| Quân | Đỏ | Đen | Chữ Hán |
|------|-----|-----|---------|
| Tướng/Soái | 帥 (Soái) | 將 (Tướng) | — |
| Sĩ | 仕 | 士 | — |
| Tượng | 相 | 象 | — |
| Xe | 車 | 車 | — |
| Pháo | 炮 | 砲 | — |
| Mã | 馬 | 馬 | — |
| Tốt/Binh | 兵 (Binh) | 卒 (Tốt) | — |

Kích thước quân cờ: dynamic — `min(boardWidth / 10, boardHeight / 11)` px diameter.

---

## Bàn Cờ — Board Design

- Background: `#c8a96e` (warm tan gỗ)
- 9 cột × 10 hàng đường kẻ `#8b6914`
- "Sông" (giữa bàn): label nhỏ "楚河" bên trái, "漢界" bên phải
- "Cung" (góc 3x3): đường chéo nối 2 góc cung — truyền thống
- Grid lines: 1px solid

**Board sizing:**
```
Desktop: board width = min(480px, 50vw), height = board_width * (10/9)
Tablet:  board width = min(360px, 80vw)
Mobile:  board width = min(320px, 95vw) — board fits viewport, no scroll
```

---

## Animation & Transitions

Minimal — game-first:
```
Piece move:     200ms ease-out (CSS transform)
Valid highlight: 100ms fade-in
Modal open:     150ms ease-out scale(0.95→1) + fade
Button hover:   100ms background transition
Polling update: Không animate bàn cờ (instant update để không confuse)
```

---

## Tailwind Config Extensions

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      bg: { DEFAULT: '#0f1117', surface: '#1a1d27', raised: '#242836' },
      border: '#2e3347',
      text: { primary: '#e8eaf0', secondary: '#7c8299' },
      red: { piece: '#e85d4a', light: '#ff8577' },
      black: { piece: '#a0b0c8', light: '#c8d5e8' },
      accent: { DEFAULT: '#4f9cf7', hover: '#6fb0ff', subtle: '#1d3557' },
      board: { bg: '#c8a96e', lines: '#8b6914' },
    },
    fontFamily: {
      heading: ['Outfit', 'Inter', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
      piece: ['"Noto Serif SC"', 'serif'],
    },
  }
}
```
