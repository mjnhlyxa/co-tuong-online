'use client'

import Timer from './Timer'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Icon from '@/components/ui/Icon'
import CapturedPieces from './CapturedPieces'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color, BoardState } from '@/types'
import { clsx } from 'clsx'

const INITIAL_PIECES: Record<string, number> = {
  'r-jiang': 1, 'r-shi': 2, 'r-xiang': 2, 'r-ju': 2, 'r-ma': 2, 'r-pao': 2, 'r-zu': 5,
  'b-jiang': 1, 'b-shi': 2, 'b-xiang': 2, 'b-ju': 2, 'b-ma': 2, 'b-pao': 2, 'b-zu': 5,
}

function computeCaptured(board: BoardState | undefined): { red: string[]; black: string[] } {
  if (!board) return { red: [], black: [] }
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

  const captured = computeCaptured(game.boardState)
  const myCaptures = color === 'red' ? captured.black : captured.red

  return (
    <div
      className={clsx(
        'relative flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300',
        isCurrentTurn
          ? 'bg-[var(--c-accent-bg)] border-2 border-[var(--c-accent)]/50 shadow-[0_0_0_4px_var(--c-accent-bg)]'
          : resultState
          ? resultState === 'win'
            ? 'bg-[var(--c-success-bg)] border-2 border-[var(--c-success)]/30'
            : resultState === 'loss'
            ? 'bg-[var(--c-danger-bg)] border-2 border-[var(--c-danger)]/30'
            : 'bg-[var(--c-elevated)] border-2 border-[var(--c-border)]'
          : 'bg-[var(--c-surface)] border-2 border-[var(--c-border)]/50'
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={player?.name ?? '?'} color={color} size="md" ring={false} />
        <div className={clsx(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2',
          isCurrentTurn ? 'bg-[var(--c-accent)] border-[var(--c-accent-bg)] animate-pulse' : 'bg-[var(--c-success)] border-[var(--c-surface)]'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={clsx(
            'text-sm font-semibold truncate',
            isMyColor ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'
          )}>
            {player?.name ?? '...'}
            {isMyColor && <span className="text-[10px] font-normal text-[var(--c-muted)] ml-1">(Bạn)</span>}
          </span>
          <Badge tier={tier} elo={elo} />
          {isCurrentTurn && (
            <span className="text-[10px] font-semibold text-[var(--c-accent)] uppercase tracking-wider flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[var(--c-accent)] animate-pulse" />
              {isMyColor ? 'Lượt bạn' : (color === 'red' ? 'Đỏ' : 'Đen')}
            </span>
          )}
          {resultState === 'win' && (
            <span className="text-[10px] font-semibold text-[var(--c-success)] uppercase tracking-wider flex items-center gap-1">
              <Icon name="trophy" size={10} /> Thắng
            </span>
          )}
          {resultState === 'loss' && (
            <span className="text-[10px] font-semibold text-[var(--c-danger)] uppercase tracking-wider">Thua</span>
          )}
          {resultState === 'draw' && (
            <span className="text-[10px] font-semibold text-[var(--c-muted)] uppercase tracking-wider">Hòa</span>
          )}
        </div>
        {myCaptures.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[9px] text-[var(--c-muted)] uppercase tracking-wider font-semibold shrink-0">Đã ăn</span>
            <CapturedPieces codes={myCaptures} color={color} size="sm" />
          </div>
        )}
      </div>

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
