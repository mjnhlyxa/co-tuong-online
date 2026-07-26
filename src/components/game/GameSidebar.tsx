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

export default function GameSidebar({
  messages, spectators, moves, mutedDeviceIds, isHost, deviceId, onSend, onMute, t,
}: GameSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--c-surface)] overflow-hidden">
      <Section
        icon="users"
        title="Người xem"
        count={spectators.length}
        collapsible
        defaultOpen={false}
        maxHeight="120px"
      >
        <SpectatorList spectators={spectators} />
      </Section>

      <Section
        icon="scroll"
        title="Nước đi"
        count={moves.length}
        className="flex-1 min-h-0"
        bodyClassName="overflow-y-auto contain-strict"
      >
        <MoveHistory moves={moves} />
      </Section>

      <Section
        icon="chat"
        title="Chat"
        count={messages.length}
        collapsible
        defaultOpen
        maxHeight="40%"
      >
        <ChatPanel
          messages={messages}
          deviceId={deviceId}
          mutedDeviceIds={mutedDeviceIds}
          isHost={isHost}
          onSend={onSend}
          onMute={onMute}
        />
      </Section>
    </div>
  )
}

function Section({
  icon, title, count, children, className = '', bodyClassName = '', collapsible = false, defaultOpen = true, maxHeight,
}: {
  icon: IconName
  title: string
  count?: number
  children: ReactNode
  className?: string
  bodyClassName?: string
  collapsible?: boolean
  defaultOpen?: boolean
  maxHeight?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={clsx('flex flex-col border-b border-[var(--c-border)] last:border-b-0 shrink-0', className)}>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--c-text)] shrink-0 select-none',
          collapsible ? 'cursor-pointer hover:bg-[var(--c-elevated)]/40 transition-colors' : 'cursor-default'
        )}
      >
        <Icon name={icon} size={13} className="text-[var(--c-accent)]" />
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--c-accent)] text-[var(--c-accent-text)] font-bold tabular-nums">
            {count}
          </span>
        )}
        {collapsible && (
          <Icon
            name="arrow-right"
            size={11}
            className={clsx('ml-auto text-[var(--c-muted)] transition-transform', !open && '-rotate-90')}
          />
        )}
      </button>
      {open && (
        <div
          className={clsx('flex-1 min-h-0', bodyClassName)}
          style={maxHeight && !className.includes('flex-1') ? { maxHeight, minHeight: 0 } : undefined}
        >
          {children}
        </div>
      )}
    </div>
  )
}
