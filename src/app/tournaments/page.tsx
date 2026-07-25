'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

interface TournamentListItem {
  tournamentId: string
  name: string
  description: string
  hostName: string
  status: string
  format: string
  participantCount: number
  maxPlayers: number
  minPlayers: number
  timeControlMinutes: number | null
  drawPoints: 0 | 1
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export default function TournamentsListPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'live' | 'finished' | 'all'>('open')

  useEffect(() => {
    fetchTournaments()
    const interval = setInterval(fetchTournaments, 10000)
    return () => clearInterval(interval)
  }, [filter])

  async function fetchTournaments() {
    try {
      const url = filter === 'all' ? '/api/tournaments' : `/api/tournaments?status=${filter === 'live' ? 'STARTED' : filter === 'open' ? 'OPEN' : 'FINISHED'}`
      const res = await fetch(url)
      const data = await res.json()
      setTournaments(data.tournaments ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  const filterMap: Record<string, { label: string; emoji: string }> = {
    open: { label: 'Đang mở', emoji: '🟢' },
    live: { label: 'Đang đấu', emoji: '🎯' },
    finished: { label: 'Đã kết thúc', emoji: '🏁' },
    all: { label: 'Tất cả', emoji: '📋' },
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 glass-strong border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Về trang chủ
          </button>
          <h1 className="font-bold text-[var(--c-text)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Giải đấu
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex gap-2 overflow-x-auto mb-6 pb-1 -mx-1 px-1">
          {Object.entries(filterMap).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFilter(key as 'open' | 'live' | 'finished' | 'all')}
              className={`text-xs px-4 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all duration-200 ${
                filter === key
                  ? 'bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] border-[var(--c-accent)] text-[var(--c-accent-text)] shadow-[var(--shadow-gold)]'
                  : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-accent)]/50 hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)]'
              }`}
            >
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-[var(--c-muted)] py-12">
            <div className="inline-block w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin mb-3" />
            <div>Đang tải...</div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border-2 border-dashed border-[var(--c-border)]">
            <div className="text-5xl mb-4">🏆</div>
            <div className="text-[var(--c-text)] font-semibold mb-1 text-lg">Chưa có giải đấu nào</div>
            <div className="text-[var(--c-muted)] text-sm mb-5">Hãy tạo giải đầu tiên từ trang chủ</div>
            <Button variant="primary" onClick={() => router.push('/')}>
              Về trang chủ
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 stagger">
            {tournaments.map(t => (
              <button
                key={t.tournamentId}
                onClick={() => router.push(`/tournament/${t.tournamentId}`)}
                className="glass rounded-xl p-4 text-left hover:border-[var(--c-accent)] transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-[var(--c-text)] group-hover:text-[var(--c-accent)] transition-colors tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {t.name}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{
                    background: t.status === 'OPEN' ? 'var(--c-success-bg)' : t.status === 'STARTED' ? 'var(--c-accent-bg)' : 'var(--c-elevated)',
                    color: t.status === 'OPEN' ? 'var(--c-success)' : t.status === 'STARTED' ? 'var(--c-accent)' : 'var(--c-muted)',
                  }}>
                    {t.status === 'OPEN' ? 'Mở' : t.status === 'STARTED' ? 'Đang đấu' : t.status === 'FINISHED' ? 'Kết thúc' : t.status}
                  </span>
                </div>
                <div className="text-xs text-[var(--c-muted)] space-y-1">
                  <div className="flex items-center gap-2">
                    <span>{t.format === 'ROUND_ROBIN' ? '🏆 Vòng tròn' : '⚔️ Bảng + Loại trực tiếp'}</span>
                    <span>•</span>
                    <span>{t.timeControlMinutes ?? '∞'} phút / ván</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Host: <span className="text-[var(--c-text)]">{t.hostName}</span></span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="font-medium text-[var(--c-text)]">
                      {t.participantCount}/{t.maxPlayers} người
                    </span>
                    <span className="text-[var(--c-dim)]">·</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
