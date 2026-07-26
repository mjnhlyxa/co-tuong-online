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
  const isRed = color === 'red'

  return (
    <div
      className={clsx(
        'relative flex items-stretch gap-0 rounded-xl transition-all duration-300 overflow-hidden',
        isCurrentTurn
          ? 'shadow-[0_0_0_2px_var(--c-accent),0_0_24px_-4px_var(--c-accent-glow)]'
          : resultState === 'win'
          ? 'shadow-[0_0_0_1.5px_var(--c-success)]'
          : resultState === 'loss'
          ? 'shadow-[0_0_0_1.5px_var(--c-danger)]'
          : 'shadow-[0_0_0_1px_var(--c-border)]'
      )}
    >
      {/* Color side indicator (left) */}
      <div
        className={clsx(
          'w-1.5 shrink-0',
          isRed ? 'bg-gradient-to-b from-[#dc2626] to-[#991b1b]' : 'bg-gradient-to-b from-[#3a3f50] to-[#1a1f2e]',
          isCurrentTurn && 'shadow-[0_0_8px_currentColor]'
        )}
        style={{ color: isRed ? '#dc2626' : '#3a3f50' }}
      />

      <div className={clsx(
        'flex-1 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5',
        isCurrentTurn ? 'bg-[var(--c-accent-bg)]' :
        resultState === 'win' ? 'bg-[var(--c-success-bg)]' :
        resultState === 'loss' ? 'bg-[var(--c-danger-bg)]' :
        'bg-[var(--c-surface)]'
      )}>
        <div className="relative shrink-0">
          <Avatar name={player?.name ?? '?'} color={color} size="md" ring={false} />
          <div className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2',
            isCurrentTurn ? 'bg-[var(--c-accent)] border-[var(--c-accent-bg)] animate-pulse' : 'bg-[var(--c-success)] border-[var(--c-surface)]'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={clsx(
              'text-sm font-bold truncate',
              isMyColor ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'
            )}>
              {player?.name ?? '...'}
              {isMyColor && <span className="text-[10px] font-normal text-[var(--c-muted)] ml-1">(Bạn)</span>}
            </span>
            <Badge tier={tier} elo={elo} />
            {isCurrentTurn && (
              <span className="text-[10px] font-bold text-[var(--c-accent)] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] animate-pulse" />
                {isMyColor ? 'Lượt bạn' : (color === 'red' ? 'Đỏ' : 'Đen')}
              </span>
            )}
            {resultState === 'win' && (
              <span className="text-[10px] font-bold text-[var(--c-success)] uppercase tracking-wider flex items-center gap-1">
                <Icon name="trophy" size={10} /> Thắng
              </span>
            )}
            {resultState === 'loss' && (
              <span className="text-[10px] font-bold text-[var(--c-danger)] uppercase tracking-wider">Thua</span>
            )}
            {resultState === 'draw' && (
              <span className="text-[10px] font-bold text-[var(--c-muted)] uppercase tracking-wider">Hòa</span>
            )}
          </div>
          {myCaptures.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[9px] text-[var(--c-muted)] uppercase tracking-wider font-bold shrink-0">Đã ăn</span>
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
    </div>
  )
}
