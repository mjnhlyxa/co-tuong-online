'use client'

import { useMemo } from 'react'

interface EloChartProps {
  data: Array<{ date: string; elo: number }>
  width?: number
  height?: number
  className?: string
}

export default function EloChart({ data, width = 480, height = 160, className = '' }: EloChartProps) {
  const { path, area, minY, maxY, points } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', area: '', minY: 0, maxY: 100, points: [] }
    }
    const minE = Math.min(...data.map(d => d.elo))
    const maxE = Math.max(...data.map(d => d.elo))
    const range = Math.max(maxE - minE, 50) // minimum 50 ELO range
    const padY = 20
    const innerH = height - padY * 2
    const innerW = width - 40 // padding for axis labels
    const x0 = 30
    const y0 = padY
    const xStep = data.length > 1 ? innerW / (data.length - 1) : 0
    const minY = minE - range * 0.15
    const maxY = maxE + range * 0.15
    const yRange = maxY - minY

    const pts = data.map((d, i) => ({
      x: x0 + i * xStep,
      y: y0 + innerH - ((d.elo - minY) / yRange) * innerH,
      elo: d.elo,
    }))

    let path = ''
    if (pts.length === 1) {
      path = `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 1} ${pts[0].y}`
    } else {
      path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    }
    const area = `${path} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`

    return { path, area, minY, maxY, points: pts }
  }, [data, width, height])

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-xs text-[var(--c-muted)] ${className}`} style={{ width, height }}>
        Chưa có dữ liệu
      </div>
    )
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} style={{ width: '100%', height: 'auto', maxWidth: width }}>
      <defs>
        <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      <line x1="30" y1="20" x2={width - 10} y2="20" stroke="var(--c-border)" strokeWidth="0.5" />
      <line x1="30" y1={height - 20} x2={width - 10} y2={height - 20} stroke="var(--c-border)" strokeWidth="0.5" />
      {/* Y axis labels */}
      <text x="4" y="14" fontSize="9" fill="var(--c-muted)" fontFamily="JetBrains Mono, monospace">{maxY}</text>
      <text x="4" y={height - 14} fontSize="9" fill="var(--c-muted)" fontFamily="JetBrains Mono, monospace">{minY}</text>
      {/* Area fill */}
      <path d={area} fill="url(#eloGrad)" />
      {/* Line */}
      <path d={path} fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="var(--c-accent)" />
          <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="var(--c-accent)" strokeOpacity="0.3" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}
