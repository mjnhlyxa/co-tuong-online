'use client'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'

interface CapturedPiecesProps {
  codes: string[]
  color: 'red' | 'black'
  size?: 'sm' | 'md'
}

const PIECE_VALUE: Record<string, number> = {
  k: 100, a: 20, e: 20, h: 90, r: 40, c: 45, p: 10,
}

export default function CapturedPieces({ codes, color, size = 'md' }: CapturedPiecesProps) {
  if (codes.length === 0) return null
  const sorted = [...codes].sort((a, b) => (PIECE_VALUE[b[1]!] ?? 0) - (PIECE_VALUE[a[1]!] ?? 0))
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[12px]' : 'w-6 h-6 text-[14px]'

  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((code, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center rounded-full font-bold border-2 ${sizeClass}`}
          style={{
            background: color === 'red' ? '#fde0d9' : '#1a1f2e',
            color: color === 'red' ? '#dc2626' : '#e8eaef',
            borderColor: color === 'red' ? '#dc2626' : '#3a405a',
            opacity: 0.7,
          }}
          title={PIECE_CHARS[code as keyof typeof PIECE_CHARS] ?? code}
        >
          {PIECE_CHARS[code as keyof typeof PIECE_CHARS] ?? '?'}
        </span>
      ))}
    </div>
  )
}
