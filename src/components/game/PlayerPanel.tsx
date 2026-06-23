'use client'

import Timer from './Timer'
import Badge from '@/components/ui/Badge'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color } from '@/types'

interface PlayerPanelProps {
  game: GameState
  color: Color
  position: 'top' | 'bottom'
  isMyColor?: boolean // true if this panel belongs to the current user
}

export default function PlayerPanel({ game, color, position, isMyColor }: PlayerPanelProps) {
  const { t } = useI18n()
  const player = color === 'red' ? game.redPlayer : game.blackPlayer
  const isCurrentTurn = game.currentTurn === color && game.status === 'playing'

  const elo = player?.eloAtStart ?? 1200
  const tier = elo >= 1900 ? 'diamond' : elo >= 1600 ? 'platinum' : elo >= 1400 ? 'gold' : elo >= 1200 ? 'silver' : 'bronze'

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
        isCurrentTurn
          ? 'bg-[var(--c-accent-bg)] border border-[var(--c-accent)]/40 shadow-[0_0_12px_rgba(var(--c-accent-rgb,var(--c-accent)),0.15)]'
          : 'bg-[var(--c-surface)] border border-[var(--c-border)]'
      }`}
    >
      {/* Color indicator */}
      <div
        className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${color === 'red' ? 'bg-[var(--c-danger)]' : 'bg-[var(--c-piece-black)]'} ${
          isCurrentTurn ? 'scale-125 shadow-[0_0_6px_currentColor]' : ''
        }`}
      />

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--c-text)] truncate">{player?.name ?? '...'}</span>
          <Badge tier={tier} elo={elo} />
        </div>

        {/* Turn indicator — more visible but subtle */}
        {isCurrentTurn && (
          <div
            className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium animate-[fadeInScale_0.3s_ease-out]"
            style={{
              color: 'var(--c-accent)',
              animation: 'fadeInScale 0.3s ease-out forwards',
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] animate-pulse" />
            {isMyColor ? (t('yourTurn') || 'Lượt bạn') : (color === 'red' ? t('redTurn') : t('blackTurn'))}
          </div>
        )}
      </div>

      {/* Timer */}
      <Timer
        timeRemainingMs={game.timeControl ? game.timeRemaining?.[color] ?? null : null}
        isActive={isCurrentTurn}
        lastMoveAt={game.lastMoveAt ?? null}
      />
    </div>
  )
}