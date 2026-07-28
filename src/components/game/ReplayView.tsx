'use client'

import { useEffect, useRef, useState } from 'react'
import Board from './Board'
import PlayerPanel from './PlayerPanel'
import Icon from '@/components/ui/Icon'
import { getInitialBoard } from '@/lib/xiangqi/board'
import type { BoardState, Color, MoveRecord, GameState } from '@/types'

interface ReplayViewProps {
  moves: MoveRecord[]
  redPlayer: { name: string; deviceId: string }
  blackPlayer: { name: string; deviceId: string }
  result: { winner: 'red' | 'black' | 'draw' | null; endReason: string | null }
  initialBoard?: BoardState
}

export default function ReplayView({ moves, redPlayer, blackPlayer, result, initialBoard }: ReplayViewProps) {
  const startBoard = initialBoard ?? getInitialBoard()
  const [step, setStep] = useState(0) // 0 = initial, moves.length = final
  const [autoplay, setAutoplay] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Compute current board at step
  const currentBoard: BoardState = (() => {
    if (step === 0) return startBoard
    const m = moves[step - 1]
    if (m?.boardAfter) return m.boardAfter as BoardState
    return startBoard
  })()

  // Build incremental board from moves (fallback if boardAfter missing)
  const computedBoard: BoardState = (() => {
    if (currentBoard !== startBoard) return currentBoard
    let b: BoardState = startBoard
    for (let i = 0; i < step; i++) {
      const m = moves[i]
      if (!m) break
      const newB = b.map(row => [...row])
      const piece = newB[m.from.row]?.[m.from.col]
      if (!piece) continue
      newB[m.to.row][m.to.col] = piece
      newB[m.from.row][m.from.col] = null
      b = newB
    }
    return b
  })()

  // Determine current turn at this step
  const currentTurn: Color = (() => {
    if (step === 0) return 'red'
    return moves[step - 1]?.color === 'red' ? 'black' : 'red'
  })()

  // Autoplay
  useEffect(() => {
    if (!autoplay) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    if (step >= moves.length) {
      setAutoplay(false)
      return
    }
    timerRef.current = setInterval(() => {
      setStep(s => Math.min(s + 1, moves.length))
    }, 800 / speed)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoplay, step, moves.length, speed])

  useEffect(() => {
    if (step >= moves.length && autoplay) setAutoplay(false)
  }, [step, autoplay, moves.length])

  const currentMove = step > 0 ? moves[step - 1] : null
  const isInCheck = false // simplified - would need to compute

  if (moves.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-[var(--c-muted)]">
        Ván đấu không có nước đi nào
      </div>
    )
  }

  // Build a minimal GameState-like object for PlayerPanel
  const replayGameState: GameState = {
    roomId: 'replay',
    status: 'finished',
    currentTurn,
    currentMoveNumber: step,
    boardState: computedBoard,
    moves: moves.slice(0, step),
    redPlayer: { deviceId: redPlayer.deviceId, name: redPlayer.name, eloAtStart: 0 },
    blackPlayer: { deviceId: blackPlayer.deviceId, name: blackPlayer.name, eloAtStart: 0 },
    winner: result.winner,
    endReason: (result.endReason ?? null) as GameState['endReason'],
    myColor: null,
    timeControl: null,
    timeRemaining: { red: 0, black: 0 },
    lastMoveAt: null,
    allowSpectators: false,
    allowTakeback: false,
    spectators: [],
    chat: [],
    mutedDeviceIds: [],
    takebackRequest: null,
    takebacksUsed: { red: 0, black: 0 },
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Board with current position — flex-1 to take available space */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {/* Mobile only: top player panel */}
        <div className="lg:hidden">
          <PlayerPanel game={replayGameState} color="black" position="top" isMyColor={false} />
        </div>

        <Board
          board={computedBoard}
          myColor="red"
          currentTurn={currentTurn}
          lastMove={currentMove ?? null}
          isInCheck={isInCheck}
          disabled
          onMove={() => {}}
        />

        {/* Mobile only: bottom player panel */}
        <div className="lg:hidden">
          <PlayerPanel game={replayGameState} color="red" position="bottom" isMyColor={false} />
        </div>
      </div>

      {/* Desktop: side player panels + controls stacked vertically */}
      <div className="hidden lg:flex flex-col gap-3 w-56 xl:w-64 shrink-0">
        <PlayerPanel game={replayGameState} color="black" position="top" isMyColor={false} />
        <PlayerPanel game={replayGameState} color="red" position="bottom" isMyColor={false} />

        {/* Replay controls */}
        <div className="glass-panel rounded-xl p-4 space-y-3">
          {/* Move info: fixed height so controls don't jump when text changes */}
          <div className="min-h-[2.5rem] flex flex-col justify-center">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[var(--c-text)] tabular-nums">
                {step}/{moves.length}
              </span>
              <span className="ml-2 text-[var(--c-text-secondary)] truncate flex-1 text-right text-xs">
                {currentMove
                  ? `${currentMove.notation}${currentMove.captured ? ` · ăn ${currentMove.captured}` : ''}${currentMove.isCheck ? ' · chiếu' : ''}`
                  : 'Vị trí ban đầu'}
              </span>
            </div>
            <div className="min-h-[1.25rem] mt-0.5">
              {result.winner && step === moves.length && (
                <span className={`text-[10px] font-bold uppercase ${
                  result.winner === 'red' ? 'text-[var(--c-danger)]' :
                  result.winner === 'black' ? 'text-[var(--c-piece-black)]' :
                  'text-[var(--c-muted)]'
                }`}>
                  {result.winner === 'red' ? redPlayer.name :
                   result.winner === 'black' ? blackPlayer.name : 'Hòa'} thắng
                </span>
              )}
            </div>
          </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={moves.length}
          value={step}
          onChange={(e) => setStep(parseInt(e.target.value))}
          className="w-full accent-[var(--c-accent)]"
        />

        {/* Buttons - stacked in 2 rows: row 1 = arrows, row 2 = autoplay + speed.
            Skip icons (Đầu/Cuối) use a vertical bar + arrow, distinct from prev/next. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setStep(0)}
              className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
              title="Về đầu trận"
              aria-label="Về đầu trận"
            >
              {/* skip-to-start: bar + left arrow */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="2" height="10" rx="0.5" />
                <path d="M14 3.5v9a0.5 0.5 0 0 1-0.8 0.4L7 8.4a0.5 0.5 0 0 1 0-0.8l6.2-4.5A0.5 0.5 0 0 1 14 3.5z" />
              </svg>
            </button>
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
              title="Bước trước"
              aria-label="Bước trước"
            >
              <Icon name="arrow-left" size={14} />
            </button>
            <button
              onClick={() => setStep(s => Math.min(moves.length, s + 1))}
              className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
              title="Bước sau"
              aria-label="Bước sau"
            >
              <Icon name="arrow-right" size={14} />
            </button>
            <button
              onClick={() => setStep(moves.length)}
              className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
              title="Về cuối trận"
              aria-label="Về cuối trận"
            >
              {/* skip-to-end: right arrow + bar */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 3.5v9a0.5 0.5 0 0 0 0.8 0.4l6.2-4.5a0.5 0.5 0 0 0 0-0.8L2.8 3.1A0.5 0.5 0 0 0 2 3.5z" />
                <rect x="11" y="3" width="2" height="10" rx="0.5" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setAutoplay(a => !a)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                autoplay
                  ? 'bg-[var(--c-accent)] text-[var(--c-accent-text)]'
                  : 'bg-[var(--c-elevated)] text-[var(--c-text-secondary)] hover:bg-[var(--c-elevated-2)]'
              }`}
            >
              <Icon name={autoplay ? 'pause' : 'play'} size={12} />
              {autoplay ? 'Tạm dừng' : 'Tự động'}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-2 py-1 text-xs text-[var(--c-text)] cursor-pointer"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>
          </div>
        </div>
        </div>
      </div>

      {/* Mobile: replay controls below the board */}
      <div className="lg:hidden glass-panel rounded-xl p-4 space-y-3">
        {/* Move info: fixed height so controls don't jump when text changes */}
        <div className="min-h-[2.5rem] flex flex-col justify-center">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[var(--c-text)] tabular-nums">
              {step}/{moves.length}
            </span>
            <span className="ml-2 text-[var(--c-text-secondary)] truncate flex-1 text-right text-xs">
              {currentMove
                ? `${currentMove.notation}${currentMove.captured ? ` · ăn ${currentMove.captured}` : ''}${currentMove.isCheck ? ' · chiếu' : ''}`
                : 'Vị trí ban đầu'}
            </span>
          </div>
          <div className="min-h-[1.25rem] mt-0.5">
            {result.winner && step === moves.length && (
              <span className={`text-[10px] font-bold uppercase ${
                result.winner === 'red' ? 'text-[var(--c-danger)]' :
                result.winner === 'black' ? 'text-[var(--c-piece-black)]' :
                'text-[var(--c-muted)]'
              }`}>
                {result.winner === 'red' ? redPlayer.name :
                 result.winner === 'black' ? blackPlayer.name : 'Hòa'} thắng
              </span>
            )}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={moves.length}
          value={step}
          onChange={(e) => setStep(parseInt(e.target.value))}
          className="w-full accent-[var(--c-accent)]"
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => setStep(0)} className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]" title="Về đầu trận" aria-label="Về đầu trận">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="2" height="10" rx="0.5" />
                <path d="M14 3.5v9a0.5 0.5 0 0 1-0.8 0.4L7 8.4a0.5 0.5 0 0 1 0-0.8l6.2-4.5A0.5 0.5 0 0 1 14 3.5z" />
              </svg>
            </button>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]" title="Bước trước" aria-label="Bước trước">
              <Icon name="arrow-left" size={14} />
            </button>
            <button onClick={() => setStep(s => Math.min(moves.length, s + 1))} className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]" title="Bước sau" aria-label="Bước sau">
              <Icon name="arrow-right" size={14} />
            </button>
            <button onClick={() => setStep(moves.length)} className="p-2 rounded-lg hover:bg-[var(--c-elevated)] text-[var(--c-muted)] hover:text-[var(--c-text)]" title="Về cuối trận" aria-label="Về cuối trận">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 3.5v9a0.5 0.5 0 0 0 0.8 0.4l6.2-4.5a0.5 0.5 0 0 0 0-0.8L2.8 3.1A0.5 0.5 0 0 0 2 3.5z" />
                <rect x="11" y="3" width="2" height="10" rx="0.5" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setAutoplay(a => !a)} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${autoplay ? 'bg-[var(--c-accent)] text-[var(--c-accent-text)]' : 'bg-[var(--c-elevated)] text-[var(--c-text-secondary)] hover:bg-[var(--c-elevated-2)]'}`}>
              <Icon name={autoplay ? 'pause' : 'play'} size={12} />
              {autoplay ? 'Tạm dừng' : 'Tự động'}
            </button>
            <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-2 py-1 text-xs text-[var(--c-text)] cursor-pointer">
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
