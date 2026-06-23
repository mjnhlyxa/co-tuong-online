'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, SpectatorInfo, MoveRecord } from '@/types'

interface GameSidebarProps {
  messages: ChatMessage[]
  spectators: SpectatorInfo[]
  moves: MoveRecord[]
  mutedDeviceIds: string[]
  isHost: boolean
  deviceId: string
  onSend: (msg: string) => void
  onMute: (targetId: string, mute: boolean) => void
  t: (key: string) => string
}

// Moves Panel - Compact, shows last 10 moves
function MovesPanel({ moves, t }: { moves: MoveRecord[]; t: (key: string) => string }) {
  const recentMoves = moves.slice(-10)
  const pairs: { red: MoveRecord | null; black: MoveRecord | null; index: number }[] = []
  for (let i = 0; i < recentMoves.length; i += 2) {
    pairs.push({ red: recentMoves[i], black: recentMoves[i + 1] ?? null, index: Math.floor(i / 2) })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--c-border)]">
        <div className="flex items-center gap-2">
          <span className="text-sm">📜</span>
          <span className="text-xs font-semibold text-[var(--c-text)]">{t('moveHistory') || 'Move History'}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {moves.length === 0 ? (
          <div className="text-center text-[var(--c-muted)] text-xs py-4">{t('noMovesYet') || 'No moves yet'}</div>
        ) : (
          <div className="p-2 space-y-0.5">
            {pairs.map(({ red, black, index }) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className="text-[10px] text-[var(--c-dim)] w-4 text-right shrink-0">{index + 1}.</span>
                {red && (
                  <span className={`flex-1 px-1.5 py-0.5 rounded truncate font-mono ${
                    index === pairs.length - 1 && moves.length % 2 === 1
                      ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent)]'
                      : 'text-[var(--c-danger)]'
                  }`}>
                    {red.notation}
                  </span>
                )}
                {black && (
                  <span className={`flex-1 px-1.5 py-0.5 rounded truncate font-mono ${
                    index === pairs.length - 1 && moves.length % 2 === 0
                      ? 'bg-[var(--c-accent-bg)] text-[var(--c-accent)]'
                      : 'text-[var(--c-piece-black)]'
                  }`}>
                    {black.notation}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Chat Panel - Always visible with input
function ChatPanel({ messages, deviceId, mutedDeviceIds, isHost, onSend, onMute, t }: {
  messages: ChatMessage[]
  deviceId: string
  mutedDeviceIds: string[]
  isHost: boolean
  onSend: (msg: string) => void
  onMute: (targetId: string, mute: boolean) => void
  t: (key: string) => string
}) {
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
    <div className="flex flex-col h-full border-t border-[var(--c-border)]">
      <div className="px-3 py-2 border-b border-[var(--c-border)]">
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <span className="text-xs font-semibold text-[var(--c-text)]">{t('chat') || 'Chat'}</span>
          {messages.length > 0 && (
            <span className="text-[10px] bg-[var(--c-accent-bg)] text-[var(--c-accent)] px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1.5 space-y-1.5">
        {messages.length === 0 && (
          <div className="text-center text-[var(--c-muted)] text-xs py-3">{t('noMessages') || 'No messages'}</div>
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
              <p className="text-xs text-[var(--c-text)] break-words leading-relaxed">{msg.message}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {/* Chat Input */}
      <div className="p-2 border-t border-[var(--c-border)]">
        {isMuted ? (
          <div className="text-center text-[var(--c-muted)] text-xs py-2 bg-red-500/10 rounded-lg">{t('youAreMuted')}</div>
        ) : (
          <div className="flex gap-1.5">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('messagePlaceholder') || 'Message...'}
              maxLength={200}
              className="flex-1 bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-1.5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-h)] text-white rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {t('send') || 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Spectators Panel - Compact list
function SpectatorsPanel({ spectators, t }: { spectators: SpectatorInfo[]; t: (key: string) => string }) {
  return (
    <div className="flex flex-col h-full border-t border-[var(--c-border)]">
      <div className="px-3 py-2 border-b border-[var(--c-border)]">
        <div className="flex items-center gap-2">
          <span className="text-sm">👁</span>
          <span className="text-xs font-semibold text-[var(--c-text)]">{t('spectators') || 'Spectators'}</span>
          {spectators.length > 0 && (
            <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full">
              {spectators.length}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1.5">
        {spectators.length === 0 ? (
          <div className="text-center text-[var(--c-muted)] text-xs py-3">{t('noSpectators') || 'No spectators'}</div>
        ) : (
          <div className="space-y-1">
            {spectators.map(s => (
              <div key={s.deviceId} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs text-[var(--c-text)] truncate">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function GameSidebar({ messages, spectators, moves, mutedDeviceIds, isHost, deviceId, onSend, onMute, t }: GameSidebarProps) {
  // Layout: Moves (flex-1), Chat (flex-1.2), Spectators (flex-0.8)
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Moves - top section */}
      <div className="flex-[2] min-h-0 overflow-hidden">
        <MovesPanel moves={moves} t={t} />
      </div>
      {/* Chat - middle section */}
      <div className="flex-[2] min-h-0 overflow-hidden">
        <ChatPanel
          messages={messages}
          deviceId={deviceId}
          mutedDeviceIds={mutedDeviceIds}
          isHost={isHost}
          onSend={onSend}
          onMute={onMute}
          t={t}
        />
      </div>
      {/* Spectators - bottom section */}
      <div className="flex-[1] min-h-0 overflow-hidden">
        <SpectatorsPanel spectators={spectators} t={t} />
      </div>
    </div>
  )
}