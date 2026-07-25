'use client'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import type { SpectatorInfo } from '@/types'

interface SpectatorListProps {
  spectators: SpectatorInfo[]
}

export default function SpectatorList({ spectators }: SpectatorListProps) {
  if (spectators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--c-muted)] text-sm gap-2 py-8">
        <Icon name="eye" size={32} className="opacity-30" />
        <span>Chưa có người xem</span>
        <span className="text-[10px] text-[var(--c-dim)]">Chia sẻ link để mời bạn bè theo dõi</span>
      </div>
    )
  }

  return (
    <div className="px-2 py-2 space-y-1">
      {spectators.map(s => (
        <div key={s.deviceId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--c-elevated)]/50 transition-colors">
          <Avatar name={s.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[var(--c-text)] truncate font-medium">{s.name}</div>
            <div className="text-[10px] text-[var(--c-muted)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-success)] inline-block" />
              đang xem
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
