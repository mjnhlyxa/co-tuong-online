'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color } from '@/types'

interface GameResultProps {
  game: GameState
  myColor: Color | null
  onClose: () => void
  onPlayAgain?: () => void
}

export default function GameResult({ game, myColor, onClose, onPlayAgain }: GameResultProps) {
  const { t } = useI18n()
  if (game.status !== 'finished') return null

  const iWon = game.winner === myColor
  const isDraw = game.winner === 'draw'
  const isSpectator = !myColor

  const endReasonLabels: Record<string, string> = {
    checkmate: t('checkmate') || 'Chiếu bí',
    resign: t('resign') || 'Đầu hàng',
    draw_agreement: t('drawAgreement') || 'Hòa',
    abandoned: t('abandoned') || 'Bỏ cuộc',
    timeout: t('timeout') || 'Hết giờ',
  }

  let headline = ''
  let subtext = ''
  let accent = 'var(--c-accent)'
  if (isDraw) {
    headline = 'Hòa'
    subtext = 'Ván đấu kết thúc với tỉ số hòa'
    accent = 'var(--c-info)'
  } else if (isSpectator) {
    headline = game.winner === 'red' ? 'Bên đỏ thắng' : 'Bên đen thắng'
    subtext = 'Ván đấu đã kết thúc'
  } else if (iWon) {
    headline = 'Bạn thắng!'
    subtext = 'Chúc mừng — ván đấu tuyệt vời'
    accent = 'var(--c-success)'
  } else {
    headline = 'Bạn thua'
    subtext = 'Cố gắng lần sau nhé'
    accent = 'var(--c-danger)'
  }

  const reason = endReasonLabels[game.endReason ?? ''] ?? ''
  const winnerName = game.winner === 'red' ? game.redPlayer?.name : game.blackPlayer?.name

  return (
    <Modal open={true} onClose={onClose} closeOnBackdrop={false} size="md">
      <div className="text-center space-y-5">
        {/* Trophy / icon */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, var(--c-accent-active) 100%)`,
              boxShadow: `0 12px 32px ${accent}50`,
            }}
          >
            <Icon name={isDraw ? 'sparkle' : 'trophy'} size={36} className="text-white" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: accent, fontFamily: 'Outfit, sans-serif' }}>
            {headline}
          </h2>
          <p className="text-sm text-[var(--c-muted)] mt-1.5">{subtext}</p>
        </div>

        {reason && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--c-elevated)] text-xs text-[var(--c-muted)]">
            <Icon name="info" size={12} />
            {reason}
          </div>
        )}

        {/* Players */}
        <div className="flex justify-center items-center gap-4 py-2">
          <PlayerColumn name={game.redPlayer?.name ?? 'Đỏ'} color="red" isWinner={game.winner === 'red'} />
          <div className="text-[var(--c-muted)] text-sm font-bold px-2">VS</div>
          <PlayerColumn name={game.blackPlayer?.name ?? 'Đen'} color="black" isWinner={game.winner === 'black'} />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href={`/game/${game.roomId}/replay`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--c-elevated)] hover:bg-[var(--c-elevated-2)] text-[var(--c-text)] font-semibold text-sm transition-colors border border-[var(--c-border)]"
          >
            <Icon name="history" size={14} className="text-[var(--c-accent)]" />
            Xem lại ván đấu
          </a>
          <div className="flex gap-2">
            {onPlayAgain && (
              <Button variant="primary" fullWidth onClick={onPlayAgain} icon={<Icon name="refresh" size={16} />}>
                {t('playAgain') || 'Chơi lại'}
              </Button>
            )}
            <Button variant="secondary" fullWidth onClick={onClose} icon={<Icon name="back" size={16} />}>
              {t('backToLobby') || 'Về lobby'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function PlayerColumn({ name, color, isWinner }: { name: string; color: 'red' | 'black'; isWinner: boolean }) {
  return (
    <div className={`text-center ${isWinner ? 'scale-105' : 'opacity-50'} transition-all`}>
      <div className="relative inline-block">
        <Avatar name={name} color={color} size="lg" />
        {isWinner && (
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] flex items-center justify-center ring-2 ring-[var(--c-surface)]">
            <Icon name="crown" size={14} className="text-white" />
          </div>
        )}
      </div>
      <div className={`text-sm font-semibold mt-2 ${color === 'red' ? 'text-[var(--c-danger)]' : 'text-[var(--c-piece-black)]'}`}>
        {name}
      </div>
    </div>
  )
}
