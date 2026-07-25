'use client'

import { useState, ReactNode } from 'react'
import { clsx } from 'clsx'
import Icon, { type IconName } from '@/components/ui/Icon'
import MoveHistory from './MoveHistory'
import ChatPanel from './ChatPanel'
import SpectatorList from './SpectatorList'
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

type Tab = 'moves' | 'chat' | 'spectators'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'moves', label: 'Nước đi', icon: 'scroll' },
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'spectators', label: 'Người xem', icon: 'users' },
]

export default function GameSidebar({
  messages, spectators, moves, mutedDeviceIds, isHost, deviceId, onSend, onMute, t,
}: GameSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('moves')

  return (
    <div className="flex flex-col h-full bg-[var(--c-surface)]">
      {/* Tabs */}
      <div className="flex border-b border-[var(--c-border)] shrink-0">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const count =
            tab.id === 'moves' ? moves.length :
            tab.id === 'chat' ? messages.length :
            spectators.length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-[var(--c-accent)]'
                  : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)]/30'
              )}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={clsx(
                  'text-[10px] px-1.5 rounded-full font-bold tabular-nums',
                  isActive
                    ? 'bg-[var(--c-accent)] text-[var(--c-accent-text)]'
                    : 'bg-[var(--c-elevated)] text-[var(--c-muted)]'
                )}>
                  {count}
                </span>
              )}
              {isActive && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-[var(--c-accent)] rounded-t" />}
            </button>
          )
        })}
      </div>

      {/* Active panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'moves' && <MoveHistory moves={moves} />}
        {activeTab === 'chat' && (
          <ChatPanel
            messages={messages}
            deviceId={deviceId}
            mutedDeviceIds={mutedDeviceIds}
            isHost={isHost}
            onSend={onSend}
            onMute={onMute}
          />
        )}
        {activeTab === 'spectators' && <SpectatorList spectators={spectators} />}
      </div>
    </div>
  )
}
