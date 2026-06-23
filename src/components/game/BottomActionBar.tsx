'use client'

import { useState } from 'react'
import MoveHistory from './MoveHistory'
import ChatPanel from './ChatPanel'
import SpectatorList from './SpectatorList'
import { useI18n } from '@/hooks/useI18n'
import type { GameState, Color } from '@/types'

interface BottomActionBarProps {
  game: GameState
  myColor: Color | null
  deviceId: string
  onSendChat: (msg: string) => void
  onMute: (targetId: string, mute: boolean) => void
  onRequestTakeback: () => void
  onResign: () => void
  takebacksUsed: number
  canTakeback: boolean
}

type Drawer = 'moves' | 'chat' | 'spectators' | 'more' | null

export default function BottomActionBar({
  game, myColor, deviceId, onSendChat, onMute, onRequestTakeback, onResign, takebacksUsed, canTakeback
}: BottomActionBarProps) {
  const { t } = useI18n()
  const [drawer, setDrawer] = useState<Drawer>(null)

  const isHost = myColor === 'red'
  const isPlayer = !!myColor
  const unreadCount = 0 // simplified

  function toggleDrawer(d: Drawer) {
    setDrawer(prev => prev === d ? null : d)
  }

  const tabs: { id: Drawer; label: string; icon: string; badge?: number }[] = [
    { id: 'moves', label: t('moveHistory'), icon: '📜', badge: game.moves?.length ?? 0 },
    { id: 'chat', label: t('chat'), icon: '💬', badge: (game.chat?.length ?? 0) > 0 ? game.chat?.length : undefined },
    { id: 'spectators', label: t('spectatorsShort'), icon: '👁', badge: (game.spectators?.length ?? 0) > 0 ? game.spectators?.length : undefined },
    { id: 'more', label: t('moreBtn'), icon: '⋯' },
  ]

  return (
    <>
      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-x-0 bottom-16 z-40 bg-[var(--c-surface)] border-t border-[var(--c-border)] rounded-t-xl max-h-[60vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)]">
            <span className="font-medium text-[var(--c-text)] text-sm">
              {tabs.find(t => t.id === drawer)?.label}
            </span>
            <button onClick={() => setDrawer(null)} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {drawer === 'moves' && <MoveHistory moves={game.moves ?? []} />}
            {drawer === 'chat' && (
              <ChatPanel
                messages={game.chat ?? []}
                deviceId={deviceId}
                mutedDeviceIds={game.mutedDeviceIds ?? []}
                isHost={isHost}
                onSend={onSendChat}
                onMute={onMute}
              />
            )}
            {drawer === 'spectators' && <SpectatorList spectators={game.spectators ?? []} />}
            {drawer === 'more' && (
              <div className="p-4 space-y-3">
                {isPlayer && game.status === 'playing' && (
                  <>
                    {game.allowTakeback && canTakeback && (
                      <button
                        onClick={() => { onRequestTakeback(); setDrawer(null) }}
                        className="w-full text-left px-4 py-3 rounded-lg bg-[var(--c-elevated)] hover:bg-[var(--c-border)] text-[var(--c-text)] flex items-center gap-3"
                      >
                        <span>↩️</span>
                        <div>
                          <div className="text-sm font-medium">{t('takebackTitle')}</div>
                          <div className="text-xs text-[var(--c-muted)]">{takebacksUsed}/3</div>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => { onResign(); setDrawer(null) }}
                      className="w-full text-left px-4 py-3 rounded-lg bg-[var(--c-danger)]/10 hover:bg-[var(--c-danger)]/20 text-[var(--c-danger)] flex items-center gap-3"
                    >
                      <span>🏳️</span>
                      <span className="text-sm font-medium">{t('resign')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--c-surface)] border-t border-[var(--c-border)] flex items-stretch">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => toggleDrawer(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition-colors relative ${
              drawer === tab.id ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted)] hover:text-[var(--c-text)]'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="leading-none">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="absolute top-1.5 right-[calc(50%-14px)] bg-[var(--c-accent)] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}
