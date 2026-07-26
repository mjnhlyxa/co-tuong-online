'use client'

import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
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
    const d = new Date(ts)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--c-muted)] text-sm gap-2 py-6">
            <Icon name="chat" size={28} className="opacity-30" />
            <span className="text-xs">Chưa có tin nhắn</span>
            <span className="text-[10px] text-[var(--c-dim)]">Hãy chúc đối thủ may mắn!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(msg => {
              const isOwn = msg.deviceId === deviceId
              const isMutedUser = mutedDeviceIds.includes(msg.deviceId)
              return (
                <div key={msg.id} className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar
                    name={msg.name}
                    color={msg.isPlayer ? (isOwn ? 'gold' : 'red') : 'auto'}
                    size="sm"
                    ring={false}
                  />
                  <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
                    <div className={`flex items-baseline gap-1.5 text-[10px] mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
                      <span className={`font-semibold truncate ${msg.isPlayer ? 'text-[var(--c-accent)]' : 'text-[var(--c-text-secondary)]'}`}>
                        {msg.name}
                        {isOwn && <span className="text-[var(--c-muted)] font-normal ml-0.5">(bạn)</span>}
                      </span>
                      <span className="text-[var(--c-dim)] shrink-0 tabular-nums">{formatTime(msg.timestamp)}</span>
                      {isMutedUser && <span className="text-[var(--c-warning)] text-[9px]">🔇</span>}
                      {isHost && !isOwn && (
                        <button
                          onClick={() => onMute(msg.deviceId, !isMutedUser)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--c-dim)] hover:text-[var(--c-warning)] transition-all shrink-0 p-0.5"
                          title={isMutedUser ? 'Bỏ mute' : 'Mute'}
                        >
                          <Icon name={isMutedUser ? 'volume' : 'mute'} size={11} />
                        </button>
                      )}
                    </div>
                    <p className={`text-sm text-[var(--c-text)] break-words leading-snug ${isOwn ? 'text-right' : ''}`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex gap-1.5 p-2 border-t border-[var(--c-border)]">
        {isMuted ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-[var(--c-warning)] text-xs py-2 bg-[var(--c-warning-bg)] rounded-lg">
            <Icon name="mute" size={12} />
            Bạn đã bị mute bởi chủ phòng
          </div>
        ) : (
          <>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Nhắn tin..."
              maxLength={200}
              className="flex-1 bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg text-sm text-[var(--c-text)] placeholder-[var(--c-dim)] px-3 py-2 focus:outline-none focus:border-[var(--c-accent)] focus:bg-[var(--c-elevated-2)] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="Gửi"
              className="px-3 bg-[var(--c-accent)] hover:bg-[var(--c-accent-h)] text-[var(--c-accent-text)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-semibold"
            >
              <Icon name="send" size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
