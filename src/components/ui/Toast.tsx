'use client'
import { useState, useEffect } from 'react'
import Icon from './Icon'

interface ToastMessage {
  id: number
  text: string
  variant?: 'success' | 'error' | 'info'
}

let toastCounter = 0
type Listener = (toast: ToastMessage) => void
const listeners: Listener[] = []

export function toast(text: string, variant: 'success' | 'error' | 'info' = 'success') {
  const msg: ToastMessage = { id: ++toastCounter, text, variant }
  listeners.forEach(l => l(msg))
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const listener: Listener = (msg) => {
      setToasts(prev => [...prev, msg])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== msg.id))
      }, 2500)
    }
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }, [])

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto glass-panel-strong rounded-xl px-4 py-3 flex items-center gap-2 shadow-[var(--shadow-lg)] animate-slide-in-right"
          style={{
            background: t.variant === 'success' ? 'var(--c-success-bg)' :
                       t.variant === 'error' ? 'var(--c-danger-bg)' :
                       'var(--c-surface)',
            border: t.variant === 'success' ? '1px solid var(--c-success)' :
                    t.variant === 'error' ? '1px solid var(--c-danger)' :
                    '1px solid var(--c-border)',
          }}
        >
          <Icon
            name={t.variant === 'error' ? 'close' : 'check'}
            size={16}
            className={t.variant === 'error' ? 'text-[var(--c-danger)]' : 'text-[var(--c-success)]'}
          />
          <span className="text-sm font-medium text-[var(--c-text)]">{t.text}</span>
        </div>
      ))}
    </div>
  )
}
