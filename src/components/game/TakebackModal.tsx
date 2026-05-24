'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
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
    <Modal open={open} title={t('takebackTitle')} closeOnBackdrop={false}>
      <div className="space-y-4">
        <p className="text-[var(--c-muted)] text-sm">
          {t('takebackAsk')}
        </p>
        <div className="flex items-center justify-center">
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#2e3347" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24"
                fill="none"
                stroke="#4f9cf7"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - secondsLeft / 30)}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[var(--c-text)]">{secondsLeft}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onReject}>{t('reject')}</Button>
          <Button variant="primary" className="flex-1" onClick={onAccept}>{t('accept')}</Button>
        </div>
      </div>
    </Modal>
  )
}
