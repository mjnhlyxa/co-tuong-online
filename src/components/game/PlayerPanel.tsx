'use client'

import Timer from './Timer'
import Badge from '@/components/ui/Badge'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color } from '@/types'

interface PlayerPanelProps {
  game: GameState
  color: Color
  position: 'top' | 'bottom'
}

export default function PlayerPanel({ game, color, position }: PlayerPanelProps) {
  const { t } = useI18n()
  const player = color === 'red' ? game.redPlayer : game.blackPlayer
  const isCurrentTurn = game.currentTurn === color && game.status === 'playing'

  const elo = player.eloAtStart
  const tier = elo >= 1900 ? 'diamond' : elo >= 1600 ? 'platinum' : elo >= 1400 ? 'gold' : elo >= 1200 ? 'silver' : 'bronze'

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isCurrentTurn ? 'bg-[var(--c-accent-bg)] border border-[var(--c-accent)]/40' : 'bg-[var(--c-surface)] border border-[var(--c-border)]'
      }`}
    >
      {/* Color indicator */}
      <div
        className={`w-3 h-3 rounded-full flex-shrink-0 ${color === 'red' ? 'bg-[var(--c-danger)]' : 'bg-[var(--c-piece-black)]'}`}
      />

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--c-text)] truncate">{player.name}</span>
          <Badge tier={tier} elo={elo} />
        </div>
        <div className={`text-[10px] mt-0.5 ${isCurrentTurn ? 'text-[var(--c-accent)]' : 'invisible'}`}>
          {color === 'red' ? t('redTurn') : t('blackTurn')}
        </div>
      </div>

      {/* Timer */}
      <Timer
        timeRemainingMs={game.timeControl ? game.timeRemaining[color] : null}
        isActive={isCurrentTurn}
        lastMoveAt={game.lastMoveAt}
      />
    </div>
  )
}
