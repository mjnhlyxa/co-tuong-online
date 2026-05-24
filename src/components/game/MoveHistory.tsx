'use client'

import { useEffect, useRef } from 'react'
import type { MoveRecord } from '@/types'

interface MoveHistoryProps {
  moves: MoveRecord[]
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length])

  if (moves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--c-muted)] text-sm">
        Chưa có nước đi
      </div>
    )
  }

  const pairs: [MoveRecord, MoveRecord | null][] = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null])
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto px-2 py-1 text-xs font-mono">
      {pairs.map(([red, black], idx) => (
        <div key={idx} className="flex items-center gap-2 py-0.5">
          <span className="text-[var(--c-muted)] w-6 text-right shrink-0">{idx + 1}.</span>
          <span className={`flex-1 px-1.5 py-0.5 rounded ${idx * 2 === moves.length - 1 ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent)]' : 'text-[var(--c-danger)]'}`}>
            {red.notation}
            {red.isCheck && <span className="text-[var(--c-danger)] ml-0.5">+</span>}
          </span>
          {black && (
            <span className={`flex-1 px-1.5 py-0.5 rounded ${idx * 2 + 1 === moves.length - 1 ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent)]' : 'text-[var(--c-piece-black)]'}`}>
              {black.notation}
              {black.isCheck && <span className="text-[var(--c-piece-black)] ml-0.5">+</span>}
            </span>
          )}
          {!black && <span className="flex-1" />}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
