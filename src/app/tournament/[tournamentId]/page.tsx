'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Icon from '@/components/ui/Icon'
import { usePlayer } from '@/hooks/usePlayer'

interface Tournament {
  tournamentId: string
  name: string
  description: string
  hostName: string
  hostDeviceId?: string
  status: 'DRAFT' | 'OPEN' | 'STARTED' | 'FINISHED' | 'CANCELLED'
  format: 'ROUND_ROBIN' | 'GROUP_KNOCKOUT'
  settings: {
    timeControlMinutes: number | null
    drawPoints: 0 | 1
    winPoints: number
    qualifiersPerGroup: number
    wildcardCount: number
    allowSpectators: boolean
    allowTakeback: boolean
  }
  registration: {
    minPlayers: number
    maxPlayers: number
    registrationDeadline: string | null
    scheduledStartAt: string | null
  }
  phase: { name: string; number: number }
  participantCount: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

interface Participant {
  participantId: string
  deviceId?: string
  nameSnapshot: string
  seed: number | null
  status: string
  groupId: string | null
  groupSeed: number | null
  stats: {
    played: number
    wins: number
    draws: number
    losses: number
    points: number
  }
  joinedAt: string
}

interface Match {
  matchId: string
  phase: string
  roundNumber: number
  roundLabel: string
  groupId: string | null
  bracketSlot: string | null
  player1: { deviceId: string; nameSnapshot: string; seed: number | null; color: string } | null
  player2: { deviceId: string; nameSnapshot: string; seed: number | null; color: string } | null
  status: 'SCHEDULED' | 'READY' | 'STARTED' | 'COMPLETED' | 'BYE' | 'FORFEIT' | 'CANCELLED'
  startedAt: string | null
  completedAt: string | null
  gameId: string | null
  startClaimedBy?: string | null
  result: {
    winner: 'PLAYER1' | 'PLAYER2' | 'DRAW' | 'NONE'
    score1: number | null
    score2: number | null
    resultType: string
  }
}

interface Standing {
  rank: number
  participantId: string
  nameSnapshot: string
  seed: number | null
  groupId: string | null
  groupSeed: number | null
  status: string
  stats: { played: number; wins: number; draws: number; losses: number; points: number }
  isChampion?: boolean
}

export default function TournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const router = useRouter()
  const { deviceId, player, loading: playerLoading } = usePlayer()
  const [tournamentId, setTournamentId] = useState<string>('')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'standings' | 'bracket'>('overview')
  const [viewerRole, setViewerRole] = useState<'HOST' | 'PARTICIPANT' | 'SPECTATOR'>('SPECTATOR')
  const [showJoin, setShowJoin] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [starting, setStarting] = useState(false)
  const [tab, setTab] = useState<'overview' | 'schedule' | 'standings' | 'bracket' | 'rules'>('overview')

  useEffect(() => {
    params.then(p => setTournamentId(p.tournamentId))
  }, [params])

  useEffect(() => {
    if (!tournamentId) return
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [tournamentId, deviceId])

  async function fetchAll() {
    try {
      const url = deviceId ? `/api/tournaments/${tournamentId}?deviceId=${deviceId}` : `/api/tournaments/${tournamentId}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setTournament(data.tournament)
        setParticipants(data.participants)
        setMatches(data.matches)
        setViewerRole(data.viewerRole)
      }
      const standingsRes = await fetch(`/api/tournaments/${tournamentId}/standings`)
      if (standingsRes.ok) {
        const standingsData = await standingsRes.json()
        setStandings(standingsData.standings)
      }
    } catch {}
    finally { setLoading(false) }
  }

  async function handleJoin() {
    if (!deviceId) return
    // If user already has account, use existing name without asking
    const name = joinName.trim() || player?.name || ''
    if (name.length < 2) {
      // Only show modal if user truly has no name
      setShowJoin(true)
      return
    }
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, name }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowJoin(false)
        setJoinName('')
        fetchAll()
      } else {
        setJoinError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setJoinError('Có lỗi xảy ra')
    } finally {
      setJoining(false)
    }
  }

  // Quick join for users with existing account
  function quickJoin() {
    if (!player?.name) {
      setShowJoin(true)
    } else {
      handleJoin()
    }
  }

  async function handleLeave() {
    if (!deviceId) return
    if (!confirm('Rời khỏi giải đấu?')) return
    try {
      await fetch(`/api/tournaments/${tournamentId}/join?deviceId=${deviceId}`, {
        method: 'DELETE',
      })
      fetchAll()
    } catch {}
  }

  async function handleStart() {
    setStarting(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
      if (res.ok) {
        fetchAll()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      alert('Có lỗi xảy ra')
    } finally {
      setStarting(false)
    }
  }

  async function handleStartMatch(matchId: string) {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/match/${matchId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.status === 'STARTED' && data.gameId) {
          router.push(`/game/${data.gameId}`)
        } else if (data.status === 'READY') {
          // Just mark as waiting, refresh to update UI
          fetchAll()
        }
      } else {
        alert(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      alert('Có lỗi xảy ra')
    }
  }

  async function handleShareUrl() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      alert('Đã sao chép link!')
    } catch {
      prompt('Sao chép link:', url)
    }
  }

  if (loading || playerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Không tìm thấy giải đấu</div>
          <Button onClick={() => router.push('/')}>Về trang chủ</Button>
        </div>
      </div>
    )
  }

  const isHost = viewerRole === 'HOST'
  const isParticipant = viewerRole === 'PARTICIPANT' || viewerRole === 'HOST'
  const canStart = isHost && tournament.status === 'OPEN' && tournament.participantCount >= tournament.registration.minPlayers
  const groupStandings = standings.filter(s => s.groupId)
  const overallStandings = standings.filter(s => !s.groupId || tournament.format === 'ROUND_ROBIN')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Về trang chủ
          </button>
          <div className="flex items-center gap-2">
            <TournamentStatusBadge status={tournament.status} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--c-accent-bg)] via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--c-accent)] uppercase tracking-wider">
                <TournamentFormatBadge format={tournament.format} />
                <span className="text-[var(--c-muted)]">•</span>
                <span className="text-[var(--c-muted)]">
                  {tournament.settings.timeControlMinutes ?? '∞'} phút / ván
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--c-text)] mb-3 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {tournament.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-[var(--c-muted)]">
                <span>Host: <span className="text-[var(--c-text)] font-medium">{tournament.hostName}</span></span>
                <span>•</span>
                <span>{tournament.participantCount}/{tournament.registration.maxPlayers} người chơi</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="md" onClick={handleShareUrl} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>}>
                Sao chép link
              </Button>
              {tournament.status === 'OPEN' && !isParticipant && player && (
                <Button variant="primary" size="md" onClick={quickJoin} icon={<Icon name="plus" size={14} />}>
                  Tham gia
                </Button>
              )}
              {tournament.status === 'OPEN' && isParticipant && !isHost && (
                <Button variant="secondary" size="md" onClick={handleLeave}>
                  Rời giải
                </Button>
              )}
              {canStart && (
                <Button variant="gold" size="md" loading={starting} onClick={handleStart}>
                  Bắt đầu giải
                </Button>
              )}
              {tournament.status === 'OPEN' && isHost && (
                <span className="text-xs text-[var(--c-muted)]">
                  {tournament.participantCount < tournament.registration.minPlayers
                    ? `Cần ${tournament.registration.minPlayers - tournament.participantCount} người nữa`
                    : 'Đã đủ người'}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-16 z-20 glass border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {(['overview', 'schedule', 'standings', 'bracket', 'rules'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t
                  ? 'border-[var(--c-accent)] text-[var(--c-accent)]'
                  : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]'
              }`}
            >
              {t === 'overview' && 'Tổng quan'}
              {t === 'schedule' && `Lịch đấu (${matches.length})`}
              {t === 'standings' && 'Bảng xếp hạng'}
              {t === 'bracket' && 'Bảng đấu'}
              {t === 'rules' && 'Thể lệ'}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Participants */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--c-text)] flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
                    Người chơi ({participants.length})
                  </h2>
                </div>
                {participants.length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center text-[var(--c-muted)] text-sm">
                    Chưa có người chơi nào
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 stagger">
                    {participants.map(p => (
                      <div key={p.participantId} className="glass rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] flex items-center justify-center text-sm font-bold text-[var(--c-accent-text)]">
                          {p.seed ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--c-text)] truncate">{p.nameSnapshot}</div>
                          {p.groupId && (
                            <div className="text-xs text-[var(--c-muted)]">Bảng {p.groupId}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent matches */}
              {matches.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[var(--c-text)] flex items-center gap-2">
                      <span className="w-1 h-5 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
                      Trận gần đây
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {matches.filter(m => m.status === 'COMPLETED' || m.status === 'STARTED').slice(0, 5).map(match => (
                      <MatchCard key={match.matchId} match={match} tournamentId={tournamentId} deviceId={deviceId} isHost={isHost} isParticipant={isParticipant} onStartMatch={handleStartMatch} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[var(--c-text)] mb-3 uppercase tracking-wider">Thông tin nhanh</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--c-muted)]">Hình thức</dt>
                    <dd className="font-medium text-[var(--c-text)]">
                      {tournament.format === 'ROUND_ROBIN' ? 'Vòng tròn' : 'Bảng + Loại trực tiếp'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--c-muted)]">Thời gian</dt>
                    <dd className="font-medium text-[var(--c-text)]">
                      {tournament.settings.timeControlMinutes ? `${tournament.settings.timeControlMinutes} phút` : 'Không giới hạn'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--c-muted)]">Thắng</dt>
                    <dd className="font-medium text-[var(--c-accent)]">{tournament.settings.winPoints} điểm</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--c-muted)]">Hòa</dt>
                    <dd className="font-medium text-[var(--c-accent)]">{tournament.settings.drawPoints} điểm</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--c-muted)]">Thua</dt>
                    <dd className="font-medium text-[var(--c-text)]">0 điểm</dd>
                  </div>
                </dl>
              </div>
              {(tournament.status === 'OPEN' && !isParticipant && player) && (
                <div className="glass rounded-xl p-5 border border-[var(--c-accent)]/30 bg-gradient-to-br from-[var(--c-accent-bg)] to-transparent">
                  <h3 className="font-bold text-[var(--c-text)] mb-1">Sẵn sàng tham gia?</h3>
                  <p className="text-xs text-[var(--c-muted)] mb-3">Chỉ cần bấm tham gia để đăng ký</p>
                  <Button variant="primary" fullWidth onClick={quickJoin} icon={<Icon name="plus" size={14} />}>
                    Tham gia giải
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}

        {tab === 'schedule' && (
          <section>
            <h2 className="text-lg font-bold text-[var(--c-text)] mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
              Lịch thi đấu
            </h2>
            {matches.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-[var(--c-muted)]">
                {tournament.status === 'OPEN' ? 'Lịch sẽ được tạo khi giải bắt đầu' : 'Chưa có trận đấu'}
              </div>
            ) : (
              <div className="space-y-2 stagger">
                {matches.filter(m => m.status !== 'BYE' && m.result.resultType !== 'BYE' && m.player2 !== null).map(match => (
                  <MatchCard key={match.matchId} match={match} tournamentId={tournamentId} deviceId={deviceId} isHost={isHost} isParticipant={isParticipant} onStartMatch={handleStartMatch} />
                ))}
                {matches.filter(m => m.status === 'BYE' || m.result.resultType === 'BYE' || m.player2 === null).length > 0 && (
                  <details className="text-xs text-[var(--c-muted)] mt-4">
                    <summary className="cursor-pointer hover:text-[var(--c-text)] py-2 px-3 rounded-lg hover:bg-[var(--c-elevated)]/30">
                      {matches.filter(m => m.status === 'BYE' || m.result.resultType === 'BYE' || m.player2 === null).length} trận BYE (bỏ qua do lẻ người)
                    </summary>
                    <div className="space-y-1 mt-2 pl-3 border-l-2 border-[var(--c-border)]">
                      {matches.filter(m => m.status === 'BYE' || m.result.resultType === 'BYE' || m.player2 === null).map(match => (
                        <MatchCard key={match.matchId} match={match} tournamentId={tournamentId} deviceId={deviceId} isHost={isHost} isParticipant={isParticipant} onStartMatch={handleStartMatch} />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </section>
        )}

        {tab === 'standings' && (
          <section>
            <h2 className="text-lg font-bold text-[var(--c-text)] mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
              Bảng xếp hạng
            </h2>
            {standings.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-[var(--c-muted)]">Chưa có dữ liệu</div>
            ) : (
              <div className="space-y-4">
                {tournament.format === 'GROUP_KNOCKOUT' && groupStandings.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from(new Set(groupStandings.map(s => s.groupId))).map(gid => (
                      <div key={gid} className="glass rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-gradient-to-r from-[var(--c-accent-bg)] to-transparent border-b border-[var(--c-border)]">
                          <span className="font-bold text-[var(--c-text)]">Bảng {gid}</span>
                        </div>
                        <StandingsList list={groupStandings.filter(s => s.groupId === gid)} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gradient-to-r from-[var(--c-accent-bg)] to-transparent border-b border-[var(--c-border)]">
                    <span className="font-bold text-[var(--c-text)]">
                      {tournament.format === 'GROUP_KNOCKOUT' ? 'Tổng' : 'Tổng quan'}
                    </span>
                  </div>
                  <StandingsList list={overallStandings} />
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'bracket' && (
          <section>
            <h2 className="text-lg font-bold text-[var(--c-text)] mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
              Bảng đấu
            </h2>
            {tournament.format === 'GROUP_KNOCKOUT' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from(new Set(participants.map(p => p.groupId).filter(Boolean))).map((gid: string | null) => {
                  const groupParticipants = participants.filter(p => p.groupId === gid)
                  return (
                    <div key={gid} className="glass rounded-xl p-4">
                      <div className="font-bold text-[var(--c-text)] mb-3 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] text-[var(--c-accent-text)] flex items-center justify-center text-sm">
                          {gid}
                        </span>
                        Bảng {gid}
                      </div>
                      <div className="space-y-1.5">
                        {groupParticipants.map(p => (
                          <div key={p.participantId} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--c-elevated)]/50 text-sm">
                            <span className="text-xs text-[var(--c-muted)] w-5">{p.groupSeed}</span>
                            <span className="text-[var(--c-text)] truncate flex-1">{p.nameSnapshot}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="glass rounded-xl p-8 text-center text-[var(--c-muted)]">
                Giải vòng tròn — không có bảng đấu riêng. Xem tab Lịch đấu và Bảng xếp hạng.
              </div>
            )}
          </section>
        )}

        {tab === 'rules' && (
          <section>
            <h2 className="text-lg font-bold text-[var(--c-text)] mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
              Thể lệ giải đấu
            </h2>
            <div className="glass rounded-xl p-6 space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider mb-1">Hình thức</div>
                <div className="text-[var(--c-text)]">
                  {tournament.format === 'ROUND_ROBIN'
                    ? 'Vòng tròn — mỗi người đấu với tất cả người còn lại'
                    : 'Bảng + Loại trực tiếp — chia bảng vòng tròn, sau đó loại trực tiếp'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider mb-1">Tính điểm</div>
                <div className="text-[var(--c-text)]">
                  Thắng: {tournament.settings.winPoints} điểm · Hòa: {tournament.settings.drawPoints} điểm · Thua: 0 điểm
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider mb-1">Thời gian ván</div>
                <div className="text-[var(--c-text)]">
                  {tournament.settings.timeControlMinutes ? `${tournament.settings.timeControlMinutes} phút mỗi bên` : 'Không giới hạn'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider mb-1">Quy tắc</div>
                <ul className="text-[var(--c-text)] space-y-1 list-disc list-inside">
                  <li>Chỉ 2 người trong trận mới có thể bắt đầu ván đấu</li>
                  <li>Host có quyền cập nhật kết quả nếu 2 đối thủ chơi offline</li>
                  <li>Người xem có thể theo dõi trận {tournament.settings.allowSpectators ? '(đang bật)' : '(đang tắt)'}</li>
                  <li>Hoãn nước {tournament.settings.allowTakeback ? 'được phép' : 'không được phép'}</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Join modal */}
      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Tham gia giải đấu" description={player?.name ? `Với tên "${player.name}"` : 'Nhập tên để tham gia'}>
        <div className="space-y-4">
          {!player?.name && (
            <div>
              <label className="block text-xs font-semibold text-[var(--c-text)] mb-2 uppercase tracking-wider">Tên hiển thị</label>
              <input
                value={joinName}
                onChange={e => { setJoinName(e.target.value); setJoinError('') }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Tên của bạn"
                maxLength={16}
                autoFocus
                className="w-full bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-xl px-4 py-3 text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)] text-sm"
              />
              {joinError && <p className="text-[var(--c-danger)] text-xs mt-2">{joinError}</p>}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowJoin(false)}>Hủy</Button>
            <Button variant="primary" fullWidth loading={joining} onClick={handleJoin} icon={<Icon name="check" size={14} />}>Tham gia</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TournamentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: 'var(--c-muted)' },
    OPEN: { label: 'Đang mở', color: 'var(--c-success)' },
    STARTED: { label: 'Đang đấu', color: 'var(--c-accent)' },
    FINISHED: { label: 'Kết thúc', color: 'var(--c-info)' },
    CANCELLED: { label: 'Đã hủy', color: 'var(--c-danger)' },
  }
  const s = map[status] ?? map.OPEN
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ background: `${s.color}20`, borderColor: `${s.color}50`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function TournamentFormatBadge({ format }: { format: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--c-accent-bg)] border border-[var(--c-accent)]/30 text-[var(--c-accent)]">
      {format === 'ROUND_ROBIN' ? '🏆 Vòng tròn' : '⚔️ Bảng + Loại trực tiếp'}
    </span>
  )
}

function MatchCard({
  match,
  tournamentId,
  deviceId,
  isHost,
  isParticipant,
  onStartMatch,
}: {
  match: Match
  tournamentId: string
  deviceId: string | null
  isHost: boolean
  isParticipant: boolean
  onStartMatch: (matchId: string) => void
}) {
  const isMine = isParticipant && (match.player1?.deviceId === deviceId || match.player2?.deviceId === deviceId)
  const iStarted = isMine && match.startClaimedBy === deviceId
  const opponentStarted = isMine && match.startClaimedBy && match.startClaimedBy !== deviceId
  const canStart = isMine && (match.status === 'SCHEDULED' || match.status === 'READY')
  const waitingForOpponent = isMine && match.status === 'READY' && iStarted
  const canJoin = isMine && match.status === 'READY' && opponentStarted && !iStarted

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    SCHEDULED: { bg: 'var(--c-elevated)', text: 'var(--c-muted)', label: 'Chờ' },
    READY: { bg: 'var(--c-info-bg)', text: 'var(--c-info)', label: 'Sẵn sàng' },
    STARTED: { bg: 'var(--c-warning-bg)', text: 'var(--c-warning)', label: 'Đang đấu' },
    COMPLETED: { bg: 'var(--c-success-bg)', text: 'var(--c-success)', label: 'Kết thúc' },
    BYE: { bg: 'var(--c-elevated)', text: 'var(--c-muted)', label: 'BYE' },
    FORFEIT: { bg: 'var(--c-danger-bg)', text: 'var(--c-danger)', label: 'Xử thua' },
    CANCELLED: { bg: 'var(--c-danger-bg)', text: 'var(--c-danger)', label: 'Hủy' },
  }
  const s = statusColors[match.status] ?? statusColors.SCHEDULED

  return (
    <div className={`relative overflow-hidden rounded-xl border ${
      match.result.winner === 'PLAYER1' ? 'border-l-4 border-l-[var(--c-danger)] border-[var(--c-border)]' :
      match.result.winner === 'PLAYER2' ? 'border-l-4 border-l-[var(--c-piece-black)] border-[var(--c-border)]' :
      'border border-[var(--c-border)]'
    } bg-[var(--c-surface)] hover:bg-[var(--c-elevated)]/40 transition-colors`}>
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 border-b border-[var(--c-border)] bg-[var(--c-elevated)]/30">
        <div className="text-[11px] text-[var(--c-muted)] flex items-center gap-1.5 font-semibold">
          <Icon name="scroll" size={11} className="text-[var(--c-accent)]" />
          <span>{match.roundLabel}</span>
          {match.bracketSlot && <span className="text-[var(--c-dim)]">· {match.bracketSlot}</span>}
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: s.bg, color: s.text }}
        >
          {s.label}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:px-4 py-4">
        <Player name={match.player1?.nameSnapshot ?? 'BYE'} winner={match.result.winner === 'PLAYER1'} />
        <div className="flex flex-col items-center px-1">
          <div className="w-8 h-8 rounded-full bg-[var(--c-elevated-2)] flex items-center justify-center text-[10px] font-black text-[var(--c-muted)] tracking-wider">VS</div>
        </div>
        <Player name={match.player2?.nameSnapshot ?? 'BYE'} winner={match.result.winner === 'PLAYER2'} align="right" />
      </div>
      {match.result.resultType === 'COMPLETED' && match.result.winner !== 'NONE' && (
        <div className="px-3 sm:px-4 py-2.5 border-t border-[var(--c-border)] bg-gradient-to-r from-[var(--c-accent-bg)] to-transparent text-center">
          {match.result.winner === 'DRAW' ? (
            <span className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider">Hòa</span>
          ) : (
            <span className="text-sm font-bold text-[var(--c-accent)] flex items-center justify-center gap-1.5">
              <Icon name="trophy" size={12} />
              {match.result.winner === 'PLAYER1' ? match.player1?.nameSnapshot : match.player2?.nameSnapshot} thắng
            </span>
          )}
        </div>
      )}
      <div className="px-3 sm:px-4 py-3 border-t border-[var(--c-border)] flex gap-2 justify-end bg-[var(--c-elevated)]/20">
        {match.status === 'SCHEDULED' && isMine && (
          <Button variant="primary" size="sm" onClick={() => onStartMatch(match.matchId)} icon={<Icon name="play" size={12} />}>
            Bắt đầu trận
          </Button>
        )}
        {waitingForOpponent && (
          <span className="text-xs text-[var(--c-info)] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--c-info-bg)] font-medium">
            <Icon name="info" size={12} />
            Chờ {match.player1?.deviceId === deviceId ? match.player2?.nameSnapshot : match.player1?.nameSnapshot} vào
          </span>
        )}
        {canJoin && (
          <Button variant="primary" size="sm" onClick={() => onStartMatch(match.matchId)} icon={<Icon name="play" size={12} />}>
            Vào trận
          </Button>
        )}
        {match.status === 'STARTED' && match.gameId && isMine && (
          <Button variant="primary" size="sm" onClick={() => window.location.href = `/game/${match.gameId}`} icon={<Icon name="play" size={12} />}>
            Vào trận
          </Button>
        )}
        {match.status === 'STARTED' && match.gameId && !isMine && (
          <Button variant="secondary" size="sm" onClick={() => window.location.href = `/game/${match.gameId}`} icon={<Icon name="eye" size={12} />}>
            Theo dõi
          </Button>
        )}
      </div>
    </div>
  )
}

function Player({ name, winner, align = 'left' }: { name: string; winner?: boolean; align?: 'left' | 'right' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${align === 'right' ? 'flex-row-reverse justify-end' : ''}`}>
      <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
        winner
          ? 'bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] text-[var(--c-accent-text)] shadow-[0_0_12px_rgba(212,168,73,0.5)]'
          : 'bg-gradient-to-br from-[var(--c-elevated-2)] to-[var(--c-elevated)] text-[var(--c-text)]'
      }`}>
        {initial}
        {winner && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--c-accent)] flex items-center justify-center ring-2 ring-[var(--c-surface)]">
            <Icon name="trophy" size={9} className="text-[var(--c-accent-text)]" />
          </span>
        )}
      </div>
      <div className={`min-w-0 flex-1 ${align === 'right' ? 'text-right' : ''}`}>
        <div className={`font-bold text-sm truncate ${winner ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'}`}>
          {name}
        </div>
        {winner && <div className="text-[10px] text-[var(--c-accent)] font-semibold uppercase tracking-wider">Thắng</div>}
      </div>
    </div>
  )
}

function StandingsList({ list }: { list: Standing[] }) {
  if (list.length === 0) {
    return <div className="px-4 py-6 text-center text-sm text-[var(--c-muted)]">Chưa có dữ liệu</div>
  }
  return (
    <div className="divide-y divide-[var(--c-border)]">
      {list.map(s => {
        const isPodium = s.rank <= 3
        return (
          <div
            key={s.participantId}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              s.isChampion ? 'bg-gradient-to-r from-[var(--c-accent)]/15 to-transparent' :
              isPodium ? 'bg-[var(--c-elevated)]/30' : 'hover:bg-[var(--c-elevated)]/40'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 ${
              s.rank === 1 ? 'bg-gradient-to-br from-[#fbbf24] to-[#d4a849] text-[#1a1f2e] shadow-[0_0_16px_rgba(212,168,73,0.5)]' :
              s.rank === 2 ? 'bg-gradient-to-br from-[#c0c5cf] to-[#9ba0a8] text-[#1a1f2e]' :
              s.rank === 3 ? 'bg-gradient-to-br from-[#cd7f32] to-[#a86b1f] text-white' :
              'bg-[var(--c-elevated-2)] text-[var(--c-muted)]'
            }`}>
              {s.isChampion ? <Icon name="crown" size={18} className="text-[#1a1f2e]" /> : s.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[var(--c-text)] truncate text-sm flex items-center gap-1.5">
                {s.nameSnapshot}
                {s.isChampion && <span className="text-xs text-[var(--c-accent)]">👑</span>}
              </div>
              <div className="text-[11px] text-[var(--c-muted)] flex items-center gap-2">
                <span className="text-[var(--c-success)] font-semibold">{s.stats.wins}W</span>
                <span className="text-[var(--c-muted)]">·</span>
                <span className="text-[var(--c-info)] font-semibold">{s.stats.draws}D</span>
                <span className="text-[var(--c-muted)]">·</span>
                <span className="text-[var(--c-danger)] font-semibold">{s.stats.losses}L</span>
              </div>
            </div>
            <div className={`text-right ${
              s.rank === 1 ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'
            }`}>
              <div className="text-lg font-black tabular-nums leading-none">{s.stats.points}</div>
              <div className="text-[10px] text-[var(--c-muted)] uppercase tracking-wider">pts</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
