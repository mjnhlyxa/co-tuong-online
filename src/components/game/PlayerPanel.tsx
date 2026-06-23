'use client'

import Timer from './Timer'
import Badge from '@/components/ui/Badge'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color } from '@/types'

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

  // Determine result state
  let resultState: 'win' | 'loss' | 'draw' | null = null
  if (isFinished && game.winner) {
    if (game.winner === 'draw') resultState = 'draw'
    else if (game.winner === color) resultState = 'win'
    else resultState = 'loss'
  }

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        isCurrentTurn
          ? 'bg-[var(--c-accent-bg)] border-2 border-[var(--c-accent)]/50 shadow-lg'
          : resultState
          ? resultState === 'win'
            ? 'bg-green-500/10 border-2 border-green-500/30'
            : resultState === 'loss'
            ? 'bg-red-500/10 border-2 border-red-500/30'
            : 'bg-gray-500/10 border-2 border-gray-500/30'
          : 'bg-[var(--c-surface)] border-2 border-[var(--c-border)]/50'
      }`}
    >
      {/* Color indicator with status dot */}
      <div className="relative">
        <div
          className={`w-4 h-4 rounded-full ${color === 'red' ? 'bg-[var(--c-danger)]' : 'bg-[var(--c-piece-black)]'}`}
        />
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--c-surface)]" />
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold truncate ${isMyColor ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'}`}>
            {player?.name ?? '...'}
            {isMyColor && <span className="text-[10px] font-normal text-[var(--c-muted)] ml-1">(You)</span>}
          </span>
          <Badge tier={tier} elo={elo} />
        </div>

        {/* Status line */}
        <div className="flex items-center gap-2 mt-0.5">
          {isCurrentTurn ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] animate-pulse" />
              {isMyColor ? (t('yourTurn') || 'Your turn') : (color === 'red' ? t('redTurn') : t('blackTurn'))}
            </div>
          ) : resultState ? (
            <span className={`text-xs font-medium ${
              resultState === 'win' ? 'text-green-500' : resultState === 'loss' ? 'text-red-500' : 'text-gray-400'
            }`}>
              {resultState === 'win' ? (t('youWin') || 'Won') : resultState === 'loss' ? (t('youLose') || 'Lost') : (t('draw') || 'Draw')}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--c-dim)]">
              {color === 'red' ? t('redTurn') || 'Red' : t('blackTurn') || 'Black'}
            </span>
          )}
        </div>
      </div>

      {/* Timer */}
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