'use client'

import { ReactNode, useEffect } from 'react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
  hideClose?: boolean
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdrop = true,
  hideClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={clsx(
          'relative z-10 rounded-2xl border border-[var(--glass-border-bright)] w-full',
          'bg-[var(--c-surface)]/95 backdrop-blur-2xl shadow-[var(--shadow-xl)]',
          'overflow-hidden animate-fade-in-scale',
          { 'max-w-sm': size === 'sm', 'max-w-md': size === 'md', 'max-w-2xl': size === 'lg', 'max-w-4xl': size === 'xl' }
        )}
      >
        {/* Top brass gradient line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[var(--c-accent)] to-transparent" />

        {title && (
          <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--c-border)]">
            <div>
              <h2
                id="modal-title"
                className="text-[var(--c-text)] font-bold text-xl tracking-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {title}
              </h2>
              {description && (
                <p className="text-sm text-[var(--c-muted)] mt-1">{description}</p>
              )}
            </div>
            {!hideClose && onClose && (
              <button
                onClick={onClose}
                className="text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)] transition-all p-1.5 rounded-lg -mr-1 -mt-1"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
