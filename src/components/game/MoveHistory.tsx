'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '@/hooks/useI18n'
import type { MoveRecord } from '@/types'

interface MoveHistoryProps {
  moves: MoveRecord[]
}

const VISIBLE_WINDOW = 40 // Only render last 40 moves by default

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(true)

  // Auto-scroll to bottom when new move arrives (only if already at bottom)
  useEffect(() => {
    if (isAutoScrolling.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }, [moves.length])

  // Track if user has scrolled up
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
      <div className="flex items-center justify-center h-full text-[var(--c-muted)] text-sm">
        {t('noMovesYet') ?? 'Chưa có nước đi'}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Show "earlier moves" button */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-[var(--c-accent)] hover:text-[var(--c-accent-h)] text-center py-1 border-b border-[var(--c-border)] transition-colors shrink-0 cursor-pointer"
        >
          {t('showEarlierMoves') ?? `Hiện ${moves.length - VISIBLE_WINDOW} nước trước`}
        </button>
      )}
      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] text-center py-1 border-b border-[var(--c-border)] transition-colors shrink-0 cursor-pointer"
        >
          {t('showRecentMoves') ?? 'Cuộn xuống mới nhất'}
        </button>
      )}

      {/* Move list with CSS contain for performance */}
      <div
        id="move-history-list"
        className="flex-1 overflow-y-auto px-2 py-1 contain-strict"
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-0.5">
          {pairs.map(({ pair: [red, black], index: pairIdx }) => {
            const redGlobalIdx = pairIdx * 2
            const blackGlobalIdx = pairIdx * 2 + 1
            return (
              <div key={pairIdx} className="flex items-center gap-2 py-0.5">
                <span className="text-[var(--c-muted)] w-6 text-right shrink-0 text-xs">
                  {pairIdx + 1}.
                </span>
                <span
                  className={`flex-1 px-1.5 py-0.5 rounded text-xs font-mono ${
                    redGlobalIdx === lastMoveIndex
                      ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent)]'
                      : 'text-[var(--c-danger)]'
                  }`}
                >
                  {red.notation}
                  {red.isCheck && <span className="text-[var(--c-danger)] ml-0.5">+</span>}
                </span>
                {black && (
                  <span
                    className={`flex-1 px-1.5 py-0.5 rounded text-xs font-mono ${
                      blackGlobalIdx === lastMoveIndex
                        ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent)]'
                        : 'text-[var(--c-piece-black)]'
                    }`}
                  >
                    {black.notation}
                    {black.isCheck && <span className="text-[var(--c-piece-black)] ml-0.5">+</span>}
                  </span>
                )}
                {!black && <span className="flex-1" />}
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}