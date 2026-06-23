'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
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
    checkmate: t('checkmate'),
    resign: t('resign'),
    draw_agreement: t('drawAgreement'),
    abandoned: t('abandoned'),
    timeout: t('timeout'),
  }

  let headline = ''
  if (isDraw) headline = `🤝 ${t('draw')}`
  else if (isSpectator) {
    headline = game.winner === 'red' ? t('redWins') : t('blackWins')
  } else {
    headline = iWon ? `🏆 ${t('youWin')}` : `😔 ${t('youLose')}`
  }

  const reason = endReasonLabels[game.endReason ?? ''] ?? ''
  const winLabel = `🏆 ${t('youWin').replace('!', '')}`
  const drawLabel = `🤝 ${t('draw')}`

  return (
    <Modal open={true} onClose={onClose} closeOnBackdrop={false}>
      <div className="text-center space-y-4">
        <div className="text-3xl font-bold text-[var(--c-text)]" style={{ fontFamily: 'var(--font-outfit, Outfit)' }}>
          {headline}
        </div>
        {reason && <div className="text-[var(--c-muted)] text-sm">{reason}</div>}

        <div className="flex justify-center gap-8 py-3">
          <div className="text-center">
            <div className="text-[var(--c-danger)] font-medium">{game.redPlayer?.name ?? 'Red'}</div>
            <div className="text-[var(--c-muted)] text-xs mt-0.5">
              {game.winner === 'red' ? winLabel : game.winner === 'draw' ? drawLabel : '—'}
            </div>
          </div>
          <div className="text-[var(--c-muted)] text-2xl self-center">vs</div>
          <div className="text-center">
            <div className="text-[var(--c-piece-black)] font-medium">{game.blackPlayer?.name ?? 'Black'}</div>
            <div className="text-[var(--c-muted)] text-xs mt-0.5">
              {game.winner === 'black' ? winLabel : game.winner === 'draw' ? drawLabel : '—'}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          {onPlayAgain && (
            <Button variant="primary" className="flex-1" onClick={onPlayAgain}>
              {t('playAgain')}
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t('backToLobby')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
