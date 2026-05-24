'use client'

import { ReactNode, useEffect } from 'react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
}

export default function Modal({ open, onClose, title, children, size = 'md', closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={clsx(
          'relative z-10 bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-[0_8px_32px_rgba(0,0,0,0.6)] w-full',
          { 'max-w-sm': size === 'sm', 'max-w-md': size === 'md', 'max-w-xl': size === 'lg' }
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
            <h2 className="text-[var(--c-text)] font-semibold text-base" style={{ fontFamily: 'var(--font-outfit, Outfit)' }}>{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors p-1 rounded"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.293 3.293a1 1 0 011.414 0L8 6.586l3.293-3.293a1 1 0 011.414 1.414L9.414 8l3.293 3.293a1 1 0 01-1.414 1.414L8 9.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 8 3.293 4.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
