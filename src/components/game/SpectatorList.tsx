import type { SpectatorInfo } from '@/types'

interface SpectatorListProps {
  spectators: SpectatorInfo[]
}

export default function SpectatorList({ spectators }: SpectatorListProps) {
  if (spectators.length === 0) {
    return <div className="text-[var(--c-muted)] text-xs text-center py-4">Không có người xem</div>
  }

  return (
    <div className="space-y-1 px-2 py-1">
      <div className="text-[var(--c-muted)] text-xs mb-2">{spectators.length} người đang xem</div>
      {spectators.map(s => (
        <div key={s.deviceId} className="flex items-center gap-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4caf70]" />
          <span className="text-sm text-[var(--c-text)]">{s.name}</span>
        </div>
      ))}
    </div>
  )
}
