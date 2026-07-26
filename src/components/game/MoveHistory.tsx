'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '@/hooks/useI18n'
import Icon from '@/components/ui/Icon'
import type { MoveRecord } from '@/types'

interface MoveHistoryProps {
  moves: MoveRecord[]
}

const VISIBLE_WINDOW = 60

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(true)

  useEffect(() => {
    if (isAutoScrolling.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }, [moves.length])

  const handleScroll = useCallback(() => {
    const el = document.getElementById('move-history-list')
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    isAutoScrolling.current = atBottom
  }, [])

  // Pair moves: [red, black], [red, black], ...
  const pairs: { pair: [MoveRecord, MoveRecord | null]; index: number }[] = []
  const displayMoves = showAll ? moves : moves.slice(-VISIBLE_WINDOW)
  const startIndex = showAll ? 0 : Math.max(0, moves.length - VISIBLE_WINDOW)
  for (let i = 0; i < displayMoves.length; i += 2) {
    pairs.push({
      pair: [displayMoves[i], displayMoves[i + 1] ?? null],
      index: startIndex + Math.floor(i / 2),
    })
  }

  const hasMore = moves.length > VISIBLE_WINDOW
  const lastMoveIndex = moves.length - 1

  if (moves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--c-muted)] text-sm gap-2 py-8">
        <Icon name="scroll" size={32} className="opacity-30" />
        <span>{t('noMovesYet') ?? 'Chưa có nước đi'}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-[var(--c-accent)] hover:text-[var(--c-accent-h)] text-center py-2 border-b border-[var(--c-border)] transition-colors shrink-0"
        >
          {t('showEarlierMoves') ?? `Hiện ${moves.length - VISIBLE_WINDOW} nước trước`}
        </button>
      )}
      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] text-center py-2 border-b border-[var(--c-border)] transition-colors shrink-0"
        >
          {t('showRecentMoves') ?? 'Cuộn xuống mới nhất'}
        </button>
      )}

      <div
        id="move-history-list"
        className="flex-1 overflow-y-auto px-1.5 py-1.5 contain-strict"
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-0.5">
          {pairs.map(({ pair: [red, black], index: pairIdx }) => {
            const redGlobalIdx = pairIdx * 2
            const blackGlobalIdx = pairIdx * 2 + 1
            const isCurrentPair = redGlobalIdx === lastMoveIndex || blackGlobalIdx === lastMoveIndex
            return (
              <div
                key={pairIdx}
                className={`flex items-stretch gap-0.5 rounded transition-colors ${
                  isCurrentPair ? 'bg-[var(--c-accent-bg)]' : 'hover:bg-[var(--c-elevated)]/40'
                }`}
              >
                <span className={`w-7 flex items-center justify-center text-[10px] font-mono tabular-nums shrink-0 ${
                  isCurrentPair ? 'text-[var(--c-accent)] font-bold' : 'text-[var(--c-muted)]'
                }`}>
                  {pairIdx + 1}.
                </span>
                <MoveCell move={red} color="red" isLast={redGlobalIdx === lastMoveIndex} />
                {black && <MoveCell move={black} color="black" isLast={blackGlobalIdx === lastMoveIndex} />}
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function MoveCell({ move, color, isLast }: { move: MoveRecord; color: 'red' | 'black'; isLast: boolean }) {
  const isRed = color === 'red'
  return (
    <div
      className={`flex-1 px-2 py-1 rounded text-xs font-mono flex items-center gap-1 ${
        isLast ? 'text-[var(--c-accent)] font-semibold bg-[var(--c-accent)]/10' :
        isRed ? 'text-[var(--c-danger)]' : 'text-[var(--c-piece-black)]'
      }`}
    >
      <span className="flex-1 truncate">{move.notation}</span>
      {move.isCheck && <Icon name="lightning" size={10} className="shrink-0" />}
    </div>
  )
}
