'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { useI18n } from '@/hooks/useI18n'
import type { TakebackRequest, Color } from '@/types'

interface TakebackModalProps {
  request: TakebackRequest | null
  myColor: Color | null
  onAccept: () => void
  onReject: () => void
}

export default function TakebackModal({ request, myColor, onAccept, onReject }: TakebackModalProps) {
  const { t } = useI18n()
  const [secondsLeft, setSecondsLeft] = useState(30)

  const isOpponent = request?.fromColor !== myColor
  const open = !!request && request.status === 'pending' && isOpponent

  useEffect(() => {
    if (!open) return
    setSecondsLeft(30)
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval)
          onReject()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  if (!open) return null

  return (
    <Modal open={open} title={t('takebackTitle') || 'Yêu cầu hoãn nước'} closeOnBackdrop={false} size="sm">
      <div className="text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--c-info-bg)] flex items-center justify-center">
            <Icon name="undo" size={28} className="text-[var(--c-info)]" />
          </div>
        </div>
        <p className="text-[var(--c-text)] text-sm">
          {t('takebackAsk') || 'Đối thủ muốn hoãn nước vừa đi. Bạn có đồng ý không?'}
        </p>
        <div className="flex items-center justify-center">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--c-border)" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="var(--c-accent)"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - secondsLeft / 30)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[var(--c-text)] tabular-nums">{secondsLeft}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onReject} icon={<Icon name="close" size={16} />}>
            {t('reject') || 'Từ chối'}
          </Button>
          <Button variant="primary" fullWidth onClick={onAccept} icon={<Icon name="check" size={16} />}>
            {t('accept') || 'Đồng ý'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
