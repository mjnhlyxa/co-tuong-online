'use client'

import Timer from './Timer'
import Badge from '@/components/ui/Badge'
import CapturedPieces from './CapturedPieces'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color, BoardState } from '@/types'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'

const INITIAL_PIECES: Record<string, number> = {
  rk: 1, ra: 2, re: 2, rh: 2, rr: 2, rc: 2, rp: 5,
  bk: 1, ba: 2, be: 2, bh: 2, br: 2, bc: 2, bp: 5,
}

function computeCaptured(board: BoardState): { red: string[]; black: string[] } {
  const currentCount: Record<string, number> = {}
  board.forEach(row => row.forEach(code => {
    if (code) currentCount[code] = (currentCount[code] ?? 0) + 1
  }))
  const red: string[] = []
  const black: string[] = []
  for (const code in INITIAL_PIECES) {
    const diff = (INITIAL_PIECES[code] ?? 0) - (currentCount[code] ?? 0)
    for (let i = 0; i < diff; i++) {
      if (code.startsWith('r')) red.push(code)
      else black.push(code)
    }
  }
  return { red, black }
}

interface PlayerPanelProps {
  game: GameState
  color: Color
  position: 'top' | 'bottom'
  isMyColor?: boolean
}

export default function PlayerPanel({ game, color, position, isMyColor }: PlayerPanelProps) {
  const { t } = useI18n()
  const player = color === 'red' ? game.redPlayer : game.blackPlayer
  const isCurrentTurn = game.currentTurn === color && game.status === 'playing'
  const isFinished = game.status === 'finished'

  const elo = player?.eloAtStart ?? 1200
  const tier = elo >= 1900 ? 'diamond' : elo >= 1600 ? 'platinum' : elo >= 1400 ? 'gold' : elo >= 1200 ? 'silver' : 'bronze'

  let resultState: 'win' | 'loss' | 'draw' | null = null
  if (isFinished && game.winner) {
    if (game.winner === 'draw') resultState = 'draw'
    else if (game.winner === color) resultState = 'win'
    else resultState = 'loss'
  }

  const captured = computeCaptured(game.boardState ?? [])
  // "I captured" = opponent's pieces I took
  const myCaptures = color === 'red' ? captured.black : captured.red
  // "I lost" = my pieces opponent took
  const myLosses = color === 'red' ? captured.red : captured.black

  return (
    <div
      className={`relative flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 ${
        isCurrentTurn
          ? 'bg-[var(--c-accent-bg)] border-2 border-[var(--c-accent)]/50 shadow-lg'
          : resultState
          ? resultState === 'win'
            ? 'bg-[var(--c-success-bg)] border-2 border-[var(--c-success)]/30'
            : resultState === 'loss'
            ? 'bg-[var(--c-danger-bg)] border-2 border-[var(--c-danger)]/30'
            : 'bg-[var(--c-elevated)] border-2 border-[var(--c-border)]'
          : 'bg-[var(--c-surface)] border-2 border-[var(--c-border)]/50'
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`w-4 h-4 rounded-full ${color === 'red' ? 'bg-[var(--c-danger)]' : 'bg-[var(--c-piece-black)]'}`}
        />
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--c-success)] border-2 border-[var(--c-surface)]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold truncate ${isMyColor ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'}`}>
            {player?.name ?? '...'}
            {isMyColor && <span className="text-[10px] font-normal text-[var(--c-muted)] ml-1">(Bạn)</span>}
          </span>
          <Badge tier={tier} elo={elo} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isCurrentTurn ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] animate-pulse" />
              {isMyColor ? 'Đến lượt bạn' : (color === 'red' ? 'Đỏ đang đi' : 'Đen đang đi')}
            </div>
          ) : resultState ? (
            <span className={`text-xs font-semibold ${
              resultState === 'win' ? 'text-[var(--c-success)]' : resultState === 'loss' ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'
            }`}>
              {resultState === 'win' ? 'Thắng' : resultState === 'loss' ? 'Thua' : 'Hòa'}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--c-dim)]">
              {color === 'red' ? 'Bên đỏ' : 'Bên đen'}
            </span>
          )}
        </div>
      </div>

      {/* Captured pieces (opponent's pieces I took) */}
      {myCaptures.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 mr-2 max-w-[120px] flex-wrap">
          <span className="text-[10px] text-[var(--c-muted)] uppercase tracking-wider">Đã ăn</span>
          <CapturedPieces codes={myCaptures} color={color} size="sm" />
        </div>
      )}

      <div className="flex-shrink-0">
        <Timer
          timeRemainingMs={game.timeControl ? game.timeRemaining?.[color] ?? null : null}
          isActive={isCurrentTurn}
          lastMoveAt={game.lastMoveAt ?? null}
        />
      </div>
    </div>
  )
}
