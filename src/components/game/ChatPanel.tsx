'use client'

import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/hooks/useI18n'
import type { ChatMessage } from '@/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  deviceId: string
  mutedDeviceIds: string[]
  isHost: boolean
  onSend: (msg: string) => void
  onMute: (targetId: string, mute: boolean) => void
}

export default function ChatPanel({ messages, deviceId, mutedDeviceIds, isHost, onSend, onMute }: ChatPanelProps) {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isMuted = mutedDeviceIds.includes(deviceId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const msg = input.trim()
    if (!msg || sending || isMuted) return
    setSending(true)
    setInput('')
    try {
      await onSend(msg)
    } finally {
      setSending(false)
    }
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-[var(--c-muted)] text-xs mt-4">{t('noMessages')}</div>
        )}
        {messages.map(msg => {
          const isOwn = msg.deviceId === deviceId
          return (
            <div key={msg.id} className="group flex gap-2 text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-medium truncate ${msg.isPlayer ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted)]'}`}>
                    {msg.name}
                  </span>
                  <span className="text-[var(--c-muted)] shrink-0">{formatTime(msg.timestamp)}</span>
                  {isHost && !isOwn && (
                    <button
                      onClick={() => onMute(msg.deviceId, !mutedDeviceIds.includes(msg.deviceId))}
                      className="opacity-0 group-hover:opacity-100 text-[var(--c-dim)] hover:text-[var(--c-warning)] transition-all ml-auto shrink-0"
                      title={mutedDeviceIds.includes(msg.deviceId) ? t('unmute') : t('mute')}
                    >
                      {mutedDeviceIds.includes(msg.deviceId) ? '🔇' : '🔕'}
                    </button>
                  )}
                </div>
                <p className="text-[var(--c-text)] break-words leading-relaxed">{msg.message}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-[var(--c-border)]">
        {isMuted ? (
          <div className="flex-1 text-center text-[var(--c-muted)] text-xs py-2">{t('youAreMuted')}</div>
        ) : (
          <>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('messagePlaceholder')}
              maxLength={200}
              className="flex-1 bg-[var(--c-elevated)] border border-[var(--c-border)] rounded text-sm text-[var(--c-text)] placeholder-[var(--c-dim)] px-2 py-1.5 focus:outline-none focus:border-[var(--c-accent)]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-1.5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-h)] text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('send')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
