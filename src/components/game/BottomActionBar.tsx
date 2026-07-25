'use client'

import { useState, useRef, useEffect } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import MoveHistory from './MoveHistory'
import ChatPanel from './ChatPanel'
import SpectatorList from './SpectatorList'
import { useI18n } from '@/hooks/useI18n'
import { clsx } from 'clsx'
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

interface Tab {
  id: Drawer
  label: string
  icon: IconName
  badge?: number
}

export default function BottomActionBar({
  game, myColor, deviceId, onSendChat, onMute, onRequestTakeback, onResign, takebacksUsed, canTakeback
}: BottomActionBarProps) {
  const { t } = useI18n()
  const [drawer, setDrawer] = useState<Drawer>(null)

  const isHost = myColor === 'red'
  const isPlayer = !!myColor

  function toggleDrawer(d: Drawer) {
    setDrawer(prev => prev === d ? null : d)
  }

  const tabs: Tab[] = [
    { id: 'moves', label: t('moveHistory') || 'Nước đi', icon: 'scroll', badge: game.moves?.length ?? 0 },
    { id: 'chat', label: t('chat') || 'Chat', icon: 'chat', badge: (game.chat?.length ?? 0) > 0 ? game.chat?.length : undefined },
    { id: 'spectators', label: t('spectatorsShort') || 'Xem', icon: 'users', badge: (game.spectators?.length ?? 0) > 0 ? game.spectators?.length : undefined },
    { id: 'more', label: t('moreBtn') || 'Thêm', icon: 'more' },
  ]

  return (
    <>
      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 glass-panel-strong border-t border-[var(--c-border)] rounded-t-2xl shadow-[0_-12px_32px_rgba(0,0,0,0.3)] flex flex-col max-h-[65vh] animate-slide-up">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-[var(--c-border)]" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="font-semibold text-[var(--c-text)] text-sm flex items-center gap-2">
              <Icon name={tabs.find(t => t.id === drawer)?.icon ?? 'info'} size={14} />
              {tabs.find(t => t.id === drawer)?.label}
            </span>
            <button onClick={() => setDrawer(null)} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1.5 rounded-lg hover:bg-[var(--c-elevated)]" aria-label="Đóng">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 border-t border-[var(--c-border)]">
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
              <div className="p-3 space-y-2">
                {isPlayer && game.status === 'playing' && (
                  <>
                    {game.allowTakeback && canTakeback && (
                      <button
                        onClick={() => { onRequestTakeback(); setDrawer(null) }}
                        className="w-full text-left px-4 py-3 rounded-xl bg-[var(--c-elevated)] hover:bg-[var(--c-elevated-2)] text-[var(--c-text)] flex items-center gap-3 transition-colors"
                      >
                        <Icon name="undo" size={18} className="text-[var(--c-info)]" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Yêu cầu hoãn nước</div>
                          <div className="text-xs text-[var(--c-muted)]">Còn {3 - takebacksUsed}/3 lượt</div>
                        </div>
                        <span className="text-xs text-[var(--c-muted)]">{takebacksUsed}/3</span>
                      </button>
                    )}
                    <button
                      onClick={() => { onResign(); setDrawer(null) }}
                      className="w-full text-left px-4 py-3 rounded-xl bg-[var(--c-danger-bg)] hover:bg-[var(--c-danger)]/20 text-[var(--c-danger)] flex items-center gap-3 transition-colors"
                    >
                      <Icon name="flag" size={18} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">Đầu hàng</div>
                        <div className="text-xs text-[var(--c-danger)]/70">Kết thúc ván đấu</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 glass-panel-strong border-t border-[var(--c-border)] safe-bottom">
        <div className="flex items-stretch">
          {tabs.map(tab => {
            const isActive = drawer === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => toggleDrawer(tab.id)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition-all relative min-h-[56px]',
                  isActive
                    ? 'text-[var(--c-accent)]'
                    : 'text-[var(--c-muted)] active:text-[var(--c-text)]'
                )}
              >
                <Icon name={tab.icon} size={20} />
                <span className="leading-none text-[11px] font-medium">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-1 right-[calc(50%-18px)] bg-[var(--c-accent)] text-[var(--c-accent-text)] text-[9px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold tabular-nums">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
                {isActive && <span className="absolute top-0 inset-x-4 h-0.5 bg-[var(--c-accent)] rounded-b" />}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
