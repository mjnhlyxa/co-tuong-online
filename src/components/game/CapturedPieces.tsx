'use client'
import { useEffect, useRef } from 'react'

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
  label?: string
}

export default function CapturedPieces({ codes, color, size = 'md', label }: CapturedPiecesProps) {
  if (!codes || codes.length === 0) return null

  const sorted = [...codes].sort((a, b) => (PIECE_VALUE[b[1]!] ?? 0) - (PIECE_VALUE[a[1]!] ?? 0))
  const dim = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-7 h-7' : 'w-6 h-6'

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-[var(--c-muted)] mr-1">{label}</span>
      )}
      {sorted.map((code, i) => (
        <PieceToken key={`${code}-${i}`} code={code} color={color} sizeClass={dim} />
      ))}
    </div>
  )
}

function PieceToken({ code, color, sizeClass }: { code: string; color: 'red' | 'black'; sizeClass: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const char = PIECE_CHARS[code] || '?'

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = 64
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = color === 'red' ? '#dc2626' : '#1a1f2e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${Math.round(size * 0.7)}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Heiti SC", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif`
    ctx.fillText(char, size / 2, size / 2)
  }, [char, color])

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full opacity-65 ${sizeClass}`}
      style={{
        background: color === 'red' ? '#fde0d9' : '#2a2f3e',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.15)',
      }}
      title={char}
    >
      <canvas ref={ref} className="w-full h-full" />
    </span>
  )
}
