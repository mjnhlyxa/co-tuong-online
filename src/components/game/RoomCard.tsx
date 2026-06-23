import Badge from '@/components/ui/Badge'
import type { RoomInfo } from '@/types'

const TIME_LABELS: Record<string, string> = {
  '600000': '10 phút',
  '900000': '15 phút',
  '1200000': '20 phút',
  '1800000': '30 phút',
  '2400000': '40 phút',
  '3000000': '50 phút',
  '3600000': '1 giờ',
}

const TIER_ACCENT: Record<string, string> = {
  bronze: '#b45309',
  silver: '#64748b',
  gold: '#ca8a04',
  platinum: '#0891b2',
  diamond: '#7c3aed',
}

interface RoomCardProps {
  room: RoomInfo
  onClick: () => void
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  const timeLabel = room.timeControl
    ? TIME_LABELS[String(room.timeControl)] ?? `${Math.round(room.timeControl / 60000)} phút`
    : '∞'

  const tier = room.host.tier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  const accentColor = TIER_ACCENT[tier] ?? TIER_ACCENT.bronze
  const isPlaying = room.status === 'playing'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--c-surface)] hover:bg-[var(--c-elevated)] border border-[var(--c-border)] hover:border-[var(--c-accent)]/50 rounded-xl p-4 transition-all group shadow-sm hover:shadow-md overflow-hidden relative"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--c-text)] truncate">{room.host.name}</span>
            <Badge tier={tier} elo={room.host.elo} />
            {isPlaying && (
              <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
                ● Đang chơi
              </span>
            )}
            {!isPlaying && (
              <span className="text-[10px] bg-[var(--c-accent-bg)] text-[var(--c-accent)] px-1.5 py-0.5 rounded-full font-medium">
                Chờ người
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-[var(--c-muted)] flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeLabel}
            </span>
            {room.type === 'public' && (
              <span className="text-xs text-[#4caf70] bg-[#4caf70]/10 px-1.5 py-0.5 rounded-full font-medium">● Công khai</span>
            )}
            {room.allowSpectators && (
              <span className="text-xs text-[var(--c-muted)] flex items-center gap-1">
                👁 Khán giả
              </span>
            )}
          </div>
        </div>
        <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
          isPlaying
            ? 'bg-green-500/20 text-green-500 group-hover:bg-green-500/30'
            : 'bg-[var(--c-accent-bg)] text-[var(--c-accent)] group-hover:text-[var(--c-accent-h)]'
        }`}>
          {isPlaying ? (
            <>
              Xem ngay
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </>
          ) : (
            <>
              Vào chơi
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.828 7H12a1 1 0 110 2H3.828l-2.121 2.121a1 1 0 01-1.414-1.414l3.535-3.535 .707.707z" transform="rotate(180 8 8)"/>
                <path d="M12.172 7H4a1 1 0 000 2h8.172l-2.122 2.121a1 1 0 001.414 1.415l3.243-3.243a1 1 0 000-1.414L13.464 4.636a1 1 0 00-1.414 1.414L12.172 7z"/>
              </svg>
            </>
          )}
        </div>
      </div>
    </button>
  )
}