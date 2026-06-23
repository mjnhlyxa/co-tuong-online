'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, SpectatorInfo } from '@/types'

interface GameSidebarProps {
  messages: ChatMessage[]
  spectators: SpectatorInfo[]
  mutedDeviceIds: string[]
  isHost: boolean
  deviceId: string
  onSend: (msg: string) => void
  onMute: (targetId: string, mute: boolean) => void
  t: (key: string) => string
}

function Section({ title, icon, count, children, defaultOpen = true }: {
  title: string
  icon: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--c-border)] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-[var(--c-elevated)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-medium text-[var(--c-text)]">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] bg-[var(--c-accent-bg)] text-[var(--c-accent)] px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[var(--c-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pb-2">{children}</div>}
    </div>
  )
}

interface ChatSectionProps {
  messages: ChatMessage[]
  deviceId: string
  mutedDeviceIds: string[]
  isHost: boolean
  onSend: (msg: string) => void
  onMute: (targetId: string, mute: boolean) => void
  t: (key: string) => string
}

function ChatSection({ messages, deviceId, mutedDeviceIds, isHost, onSend, onMute, t }: ChatSectionProps) {
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
      <div className="flex-1 overflow-y-auto px-2 space-y-2 max-h-48">
        {messages.length === 0 && (
          <div className="text-center text-[var(--c-muted)] text-xs py-3">{t('noMessages')}</div>
        )}
        {messages.map(msg => {
          const isOwn = msg.deviceId === deviceId
          return (
            <div key={msg.id} className="group">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xs font-medium ${isOwn ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted)]'}`}>
                  {msg.name}
                  {isOwn && ' (you)'}
                </span>
                <span className="text-[10px] text-[var(--c-dim)] shrink-0">{formatTime(msg.timestamp)}</span>
                {isHost && !isOwn && (
                  <button
                    onClick={() => onMute(msg.deviceId, !mutedDeviceIds.includes(msg.deviceId))}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-[var(--c-dim)] hover:text-[var(--c-warning)] transition-all cursor-pointer"
                  >
                    {mutedDeviceIds.includes(msg.deviceId) ? '🔇' : '🔕'}
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--c-text)] break-words leading-relaxed pl-0">{msg.message}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-auto pt-2 px-2">
        {isMuted ? (
          <div className="text-center text-[var(--c-muted)] text-xs py-2 bg-red-500/10 rounded">{t('youAreMuted')}</div>
        ) : (
          <div className="flex gap-1.5">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('messagePlaceholder')}
              maxLength={200}
              className="flex-1 bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-1.5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-h)] text-white rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('send')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SpectatorsSection({ spectators, t }: { spectators: SpectatorInfo[]; t: (key: string) => string }) {
  if (spectators.length === 0) {
    return <div className="text-center text-[var(--c-muted)] text-xs py-3">No spectators yet</div>
  }

  return (
    <div className="space-y-1 px-2">
      {spectators.map(s => (
        <div key={s.deviceId} className="flex items-center gap-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-[var(--c-text)]">{s.name}</span>
        </div>
      ))}
    </div>
  )
}

export default function GameSidebar({ messages, spectators, mutedDeviceIds, isHost, deviceId, onSend, onMute, t }: GameSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <Section title={t('chat') || 'Chat'} icon="💬" count={messages.length}>
        <ChatSection
          messages={messages}
          deviceId={deviceId}
          mutedDeviceIds={mutedDeviceIds}
          isHost={isHost}
          onSend={onSend}
          onMute={onMute}
          t={t}
        />
      </Section>
      <Section title={t('spectators') || 'Spectators'} icon="👁" count={spectators.length} defaultOpen={false}>
        <SpectatorsSection spectators={spectators} t={t} />
      </Section>
    </div>
  )
}