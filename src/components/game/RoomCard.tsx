import Badge from '@/components/ui/Badge'
import type { RoomInfo } from '@/types'

const TIME_LABELS: Record<string, string> = {
  '600000': '10 phút',
  '1200000': '20 phút',
  '1800000': '30 phút',
  '2400000': '40 phút',
  '3000000': '50 phút',
  '3600000': '1 giờ',
}

interface RoomCardProps {
  room: RoomInfo
  onClick: () => void
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  const timeLabel = room.timeControl
    ? TIME_LABELS[String(room.timeControl)] ?? `${Math.round(room.timeControl / 60000)} phút`
    : 'Không giới hạn'

  const tier = room.host.tier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--c-surface)] hover:bg-[var(--c-elevated)] border border-[var(--c-border)] hover:border-[var(--c-accent)]/40 rounded-lg p-4 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[var(--c-text)] truncate">{room.host.name}</span>
            <Badge tier={tier} elo={room.host.elo} />
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-[var(--c-muted)] bg-[var(--c-elevated)] px-2 py-0.5 rounded">⏱ {timeLabel}</span>
            {room.type === 'public' && (
              <span className="text-xs text-[#4caf70] bg-[#4caf70]/10 px-2 py-0.5 rounded">Công khai</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-sm font-medium text-[var(--c-accent)] group-hover:text-[var(--c-accent-h)] transition-colors whitespace-nowrap">
          Vào chơi →
        </div>
      </div>
    </button>
  )
}
