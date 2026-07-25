'use client'
import { useEffect, useRef } from 'react'

const PIECE_CHARS: Record<string, string> = {
  'r-jiang': '帥', 'r-shi': '仕', 'r-xiang': '相', 'r-ju': '俥', 'r-ma': '馬', 'r-pao': '炮', 'r-zu': '兵',
  'b-jiang': '將', 'b-shi': '士', 'b-xiang': '象', 'b-ju': '車', 'b-ma': '傌', 'b-pao': '砲', 'b-zu': '卒',
}

const PIECE_TYPE_VALUE: Record<string, number> = {
  jiang: 100, shi: 20, xiang: 20, ju: 90, ma: 40, pao: 45, zu: 10,
}

function getPieceValue(code: string): number {
  const type = code.split('-')[1] ?? ''
  return PIECE_TYPE_VALUE[type] ?? 0
}

interface CapturedPiecesProps {
  codes: string[]
  color: 'red' | 'black'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export default function CapturedPieces({ codes, color, size = 'md', label }: CapturedPiecesProps) {
  if (!codes || codes.length === 0) return null

  const sorted = [...codes].sort((a, b) => getPieceValue(b) - getPieceValue(a))
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
