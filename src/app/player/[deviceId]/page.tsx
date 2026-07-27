'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon, { type IconName } from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import EloChart from '@/components/charts/EloChart'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'

interface PlayerStats {
  deviceId: string
  name: string
  exists?: boolean
  ranking: { elo: number; tier: string; peakElo: number }
  stats: { wins: number; losses: number; draws: number; totalGames: number; abandonedWins: number; abandonedLosses: number }
  preferences: { language: string }
  lastSeenAt?: string
  createdAt?: string
}

interface GameHistoryItem {
  roomId: string
  startedAt: string
  finishedAt: string
  status: string
  winner: string
  endReason: string
  myColor: string
  opponent: { name: string; deviceId: string } | null
  moves: number
  duration: number
  result: 'win' | 'loss' | 'draw' | null
}

interface ELOHistoryItem {
  date: string
  elo: number
}

export default function PlayerProfilePage({ params }: { params: Promise<{ deviceId: string }> }) {
  const router = useRouter()
  const [deviceId, setDeviceId] = useState('')
  const [player, setPlayer] = useState<PlayerStats | null>(null)
  const [history, setHistory] = useState<GameHistoryItem[]>([])
  const [eloHistory, setEloHistory] = useState<ELOHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => setDeviceId(p.deviceId))
  }, [params])

  useEffect(() => {
    if (!deviceId) return
    let cancelled = false
    ;(async () => {
      try {
        const [profile, hist, elo] = await Promise.all([
          fetch(`/api/players/${deviceId}`).then(r => r.json()),
          fetch(`/api/players/${deviceId}/history`).then(r => r.json()).catch(() => ({ games: [] })),
          fetch(`/api/players/${deviceId}/elo-history`).then(r => r.json()).catch(() => ({ history: [] })),
        ])
        if (cancelled) return
        setPlayer(profile)
        setHistory(hist.games || [])
        setEloHistory(elo.history || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [deviceId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="text-2xl font-bold mb-2">Không tìm thấy người chơi</div>
        <button onClick={() => router.push('/')} className="text-[var(--c-accent)] hover:underline">
          Về lobby
        </button>
      </div>
    )
  }

  const total = player.stats.wins + player.stats.losses + player.stats.draws
  const winRate = total > 0 ? Math.round((player.stats.wins / total) * 100) : 0

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 glass-panel-strong border-b border-[var(--c-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-text)]">
            <Icon name="back" size={14} /> Quay lại
          </button>
          <h1 className="font-bold text-[var(--c-text)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Hồ sơ người chơi
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile header */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              name={player.name}
              color={player.ranking.elo >= 1900 ? 'gold' : player.ranking.elo >= 1600 ? 'red' : 'auto'}
              size="xl"
              ring={false}
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-3xl font-bold text-[var(--c-text)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {player.name}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                <Badge tier={player.ranking.tier as 'bronze'|'silver'|'gold'|'platinum'|'diamond'} elo={player.ranking.elo} />
                <span className="text-2xl font-black text-[var(--c-accent)] tabular-nums">{player.ranking.elo}</span>
                <span className="text-xs text-[var(--c-muted)] uppercase tracking-wider">ELO</span>
              </div>
              {player.createdAt && player.lastSeenAt && (
                <div className="text-xs text-[var(--c-muted)] mt-2">
                  Tham gia: {new Date(player.createdAt).toLocaleDateString('vi-VN')} ·
                  Hoạt động: {new Date(player.lastSeenAt).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="trophy" label="Thắng" value={player.stats.wins} accent="success" />
          <StatCard icon="flag" label="Thua" value={player.stats.losses} accent="danger" />
          <StatCard icon="users" label="Hòa" value={player.stats.draws} accent="info" />
          <StatCard icon="lightning" label="Tỉ lệ thắng" value={`${winRate}%`} accent="accent" />
        </section>

        {/* ELO history chart */}
        {eloHistory.length > 0 && (
          <section className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[var(--c-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icon name="lightning" size={14} className="text-[var(--c-accent)]" />
              Lịch sử ELO
            </h3>
            <EloChart data={eloHistory} />
          </section>
        )}

        {/* Recent games */}
        {history.length > 0 && (
          <section className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[var(--c-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icon name="history" size={14} className="text-[var(--c-accent)]" />
              Ván đấu gần đây ({history.length})
            </h3>
            <div className="space-y-2">
              {history.slice(0, 15).map((g, i) => (
                <a
                  key={i}
                  href={`/game/${g.roomId}/replay`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--c-elevated)]/40 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black ${
                    g.result === 'win' ? 'bg-[var(--c-success-bg)] text-[var(--c-success)]' :
                    g.result === 'loss' ? 'bg-[var(--c-danger-bg)] text-[var(--c-danger)]' :
                    'bg-[var(--c-elevated-2)] text-[var(--c-muted)]'
                  }`}>
                    {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--c-text)] truncate">
                      vs {g.opponent?.name ?? '(không rõ)'}
                    </div>
                    <div className="text-xs text-[var(--c-muted)]">
                      {g.moves} nước · {Math.round(g.duration / 60)} phút · {g.endReason === 'checkmate' ? 'chiếu bí' : g.endReason === 'resign' ? 'đầu hàng' : g.endReason === 'timeout' ? 'hết giờ' : g.endReason}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--c-muted)] tabular-nums shrink-0">
                    {new Date(g.finishedAt).toLocaleDateString('vi-VN')}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, accent }: { icon: IconName; label: string; value: number | string; accent: 'success' | 'danger' | 'info' | 'accent' }) {
  const colorMap = {
    success: 'var(--c-success)',
    danger: 'var(--c-danger)',
    info: 'var(--c-info)',
    accent: 'var(--c-accent)',
  }
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] uppercase tracking-wider font-semibold">
        <Icon name={icon} size={12} style={{ color: colorMap[accent] }} />
        {label}
      </div>
      <div className="text-2xl font-black text-[var(--c-text)] mt-2 tabular-nums" style={{ color: colorMap[accent] }}>
        {value}
      </div>
    </div>
  )
}
