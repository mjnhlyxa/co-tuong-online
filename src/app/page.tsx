'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Toggle from '@/components/ui/Toggle'
import LanguageSelector from '@/components/ui/LanguageSelector'
import ThemePicker from '@/components/ui/ThemePicker'
import RoomCard from '@/components/game/RoomCard'
import { usePlayer } from '@/hooks/usePlayer'
import { useI18n } from '@/hooks/useI18n'
import type { RoomInfo, Language } from '@/types'

const TIER_FILTERS = ['all', 'bronze', 'silver', 'gold', 'platinum', 'diamond'] as const
type TierFilter = (typeof TIER_FILTERS)[number]

const RANK_MEDAL: Record<number, { emoji: string; bg: string; border: string }> = {
  1: { emoji: '🥇', bg: 'rgba(212, 168, 73, 0.15)', border: 'rgba(212, 168, 73, 0.5)' },
  2: { emoji: '🥈', bg: 'rgba(192, 200, 215, 0.12)', border: 'rgba(192, 200, 215, 0.4)' },
  3: { emoji: '🥉', bg: 'rgba(205, 127, 50, 0.12)', border: 'rgba(205, 127, 50, 0.4)' },
}

export default function LobbyPage() {
  const router = useRouter()
  const { deviceId, player, loading: playerLoading, needsName, register } = usePlayer()
  const { language, setLanguage, t } = useI18n()

  const timeOptions = [
    { label: `10 ${t('minutes')}`, value: 600000 },
    { label: `15 ${t('minutes')}`, value: 900000 },
    { label: `20 ${t('minutes')}`, value: 1200000 },
    { label: `30 ${t('minutes')}`, value: 1800000 },
    { label: `40 ${t('minutes')}`, value: 2400000 },
    { label: `50 ${t('minutes')}`, value: 3000000 },
    { label: `1 ${t('hour')}`, value: 3600000 },
    { label: t('noLimit'), value: null },
  ]

  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [leaderboard, setLeaderboard] = useState<{rank: number; name: string; elo: number; tier: string; totalGames: number; wins: number; winRate: number}[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardTotal, setLeaderboardTotal] = useState(0)
  const [leaderboardHasMore, setLeaderboardHasMore] = useState(false)
  const [leaderboardOffset, setLeaderboardOffset] = useState(0)

  const [regName, setRegName] = useState('')
  const [regLang, setRegLang] = useState<Language>('vi')
  const regLangInitRef = useRef(false)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  useEffect(() => {
    if (!regLangInitRef.current) {
      setRegLang(language)
      regLangInitRef.current = true
    }
  }, [language])

  const [showCreate, setShowCreate] = useState(false)
  const [roomType, setRoomType] = useState<'public' | 'private'>('public')
  const [timeControl, setTimeControl] = useState<number | null>(1800000)
  const [allowSpectators, setAllowSpectators] = useState(true)
  const [allowTakeback, setAllowTakeback] = useState(true)
  const [creating, setCreating] = useState(false)

  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [showCreateTournament, setShowCreateTournament] = useState(false)
  const [tournamentName, setTournamentName] = useState('')
  const [creatingTournament, setCreatingTournament] = useState(false)
  const [tournamentError, setTournamentError] = useState('')

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [tierFilter])

  async function fetchRooms() {
    try {
      const params = new URLSearchParams()
      if (tierFilter !== 'all') params.set('tier', tierFilter)
      const res = await fetch(`/api/rooms?${params}`)
      const data = await res.json()
      setRooms(data.rooms ?? [])
    } catch {}
    finally { setRoomsLoading(false) }
  }

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard?limit=20')
        const data = await res.json()
        setLeaderboard(data.leaderboard ?? [])
        setLeaderboardTotal(data.total ?? 0)
        setLeaderboardHasMore(data.hasMore ?? false)
        setLeaderboardOffset(20)
      } catch {}
      finally { setLeaderboardLoading(false) }
    }
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadMoreLeaderboard() {
    try {
      const res = await fetch(`/api/leaderboard?limit=20&offset=${leaderboardOffset}`)
      const data = await res.json()
      setLeaderboard(prev => [...prev, ...(data.leaderboard ?? [])])
      setLeaderboardHasMore(data.hasMore ?? false)
      setLeaderboardOffset(prev => prev + 20)
    } catch {}
  }

  async function refreshLeaderboard() {
    setLeaderboardLoading(true)
    try {
      const res = await fetch('/api/leaderboard?limit=20')
      const data = await res.json()
      setLeaderboard(data.leaderboard ?? [])
      setLeaderboardTotal(data.total ?? 0)
      setLeaderboardHasMore(data.hasMore ?? false)
      setLeaderboardOffset(20)
    } catch {}
    finally { setLeaderboardLoading(false) }
  }

  async function handleRegister() {
    const name = regName.trim()
    if (name.length < 2 || name.length > 16) {
      setRegError(t('nameError'))
      return
    }
    setRegLoading(true)
    setRegError('')
    try {
      await register(name, regLang)
      setLanguage(regLang)
    } catch (e: unknown) {
      setRegError(e instanceof Error ? e.message : t('genericError'))
    } finally {
      setRegLoading(false)
    }
  }

  async function handleCreateRoom() {
    if (!deviceId || !player) return
    setCreating(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          name: player.name,
          type: roomType,
          timeControl,
          allowSpectators,
          allowTakeback,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreate(false)
        router.push(`/game/${data.roomId}`)
      }
    } catch {}
    finally { setCreating(false) }
  }

  async function handleJoinPrivate() {
    const code = joinCode.trim().toLowerCase()
    if (!code) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/rooms/${code}?deviceId=${deviceId}`)
      if (!res.ok) {
        const data = await res.json()
        setJoinError(data.error === 'ROOM_NOT_FOUND' ? t('roomNotFound') : data.error ?? t('genericError'))
        return
      }
      setShowJoin(false)
      router.push(`/game/${code}`)
    } catch {
      setJoinError(t('genericError'))
    } finally {
      setJoining(false)
    }
  }

  async function handleCreateTournament() {
    if (!deviceId || !player) return
    const name = tournamentName.trim()
    if (name.length < 3 || name.length > 60) {
      setTournamentError('Tên giải đấu 3–60 ký tự')
      return
    }
    setCreatingTournament(true)
    setTournamentError('')
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          name: player.name,
          tournamentName: name,
          format: 'ROUND_ROBIN',
          timeControlMinutes: 20,
          drawPoints: 1,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreateTournament(false)
        setTournamentName('')
        router.push(`/tournament/${data.tournamentId}`)
      } else {
        setTournamentError(data.error ?? 'Có lỗi xảy ra')
      }
    } catch {
      setTournamentError('Có lỗi xảy ra')
    } finally {
      setCreatingTournament(false)
    }
  }

  function handleJoinRoom(room: RoomInfo) {
    router.push(`/game/${room.roomId}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-[var(--c-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] shadow-[var(--shadow-gold)] group-hover:scale-105 transition-transform">
              <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '20px', lineHeight: '1', color: 'var(--c-accent-text)', fontWeight: 700 }}>將</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-[var(--c-text)] leading-tight tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Cờ Tướng Online
              </div>
              <div className="text-[10px] text-[var(--c-muted)] leading-none tracking-wide uppercase">Xiangqi · 象棋</div>
            </div>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/tournaments"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--c-elevated)] border border-[var(--c-border)] text-sm font-medium text-[var(--c-text-secondary)] hover:text-[var(--c-text)] hover:border-[var(--c-accent)]/50 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22c0-2 1-4 3-4s3 2 3 4M7 9v4a2 2 0 002 2h6a2 2 0 002-2V9M5 9h14"/></svg>
              Giải đấu
            </a>
            {player && (
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-[var(--c-elevated)] border border-[var(--c-border)]">
                <span className="text-sm font-semibold text-[var(--c-text)] hidden sm:block">{player.name}</span>
                <span className="text-sm font-semibold text-[var(--c-text)] sm:hidden">{player.name.charAt(0)}</span>
                <Badge tier={player.ranking.tier} elo={player.ranking.elo} />
              </div>
            )}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--c-elevated)] border border-[var(--c-border)]">
              <ThemePicker />
            </div>
            <LanguageSelector value={language} onChange={setLanguage} compact />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--c-border)]">
        {/* Decorative chess board pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden="true">
          <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="hero-board" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="var(--c-bg)" />
                <rect x="0" y="0" width="30" height="30" fill="var(--c-text)" />
                <rect x="30" y="30" width="30" height="30" fill="var(--c-text)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-board)" />
          </svg>
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--c-bg)] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 text-center lg:text-left">
              {!roomsLoading && (
                <div className="inline-flex items-center gap-2 bg-[var(--c-accent-bg)] border border-[var(--c-accent)]/30 text-[var(--c-accent)] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 animate-fade-in">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--c-accent)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--c-accent)]" />
                  </span>
                  {rooms.length > 0 ? `${rooms.length} phòng đang chờ` : 'Sẵn sàng chơi ngay'}
                </div>
              )}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--c-text)] mb-4 leading-[1.05] tracking-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {t('playOnline')}
              </h1>
              <p className="text-lg text-[var(--c-muted)] mb-8 max-w-xl mx-auto lg:mx-0">
                {t('noLoginRequired')}
              </p>
              <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowCreate(true)}
                  disabled={!player}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>}
                >
                  {t('createRoom')}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setShowJoin(true)}
                  disabled={!player}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>}
                >
                  {t('joinByCode')}
                </Button>
                <Button
                  variant="gold"
                  size="lg"
                  onClick={() => setShowCreateTournament(true)}
                  disabled={!player}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22c0-2 1-4 3-4s3 2 3 4M7 9v4a2 2 0 002 2h6a2 2 0 002-2V9M5 9h14"/></svg>}
                >
                  Tạo giải đấu
                </Button>
              </div>
              {/* Stats strip */}
              <div className="mt-10 flex gap-6 sm:gap-8 justify-center lg:justify-start text-left">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-gradient-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {leaderboardTotal || 0}
                  </div>
                  <div className="text-xs text-[var(--c-muted)] uppercase tracking-wider">Players</div>
                </div>
                <div className="w-px bg-[var(--c-border)]" />
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-gradient-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    8
                  </div>
                  <div className="text-xs text-[var(--c-muted)] uppercase tracking-wider">Languages</div>
                </div>
                <div className="w-px bg-[var(--c-border)]" />
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-gradient-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Free
                  </div>
                  <div className="text-xs text-[var(--c-muted)] uppercase tracking-wider">Forever</div>
                </div>
              </div>
            </div>

            {/* Decorative 3D chess piece */}
            <div className="hidden lg:block flex-shrink-0 animate-float">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--c-piece-red)] to-[var(--c-piece-red-h)] rounded-3xl blur-3xl opacity-30" />
                <div
                  className="relative w-48 h-48 rounded-3xl bg-gradient-to-br from-[var(--c-piece-red)] to-[var(--c-piece-red-h)] flex items-center justify-center"
                  style={{
                    boxShadow: 'var(--shadow-piece), inset 0 4px 12px rgba(255,255,255,0.2), inset 0 -4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '120px', lineHeight: '1', color: 'white', fontWeight: 700, textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>帥</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Rooms */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
              <div>
                <h2 className="text-xl font-bold text-[var(--c-text)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {t('waitingRooms')}
                </h2>
                {!roomsLoading && rooms.length > 0 && (
                  <p className="text-xs text-[var(--c-muted)] mt-0.5">{rooms.length} phòng đang mở</p>
                )}
              </div>
            </div>
            <button
              onClick={fetchRooms}
              className="text-xs text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[var(--c-elevated)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {t('reload')}
            </button>
          </div>

          {/* Tier filter */}
          <div className="flex gap-2 overflow-x-auto mb-6 pb-1 -mx-1 px-1">
            {TIER_FILTERS.map(tf => (
              <button
                key={tf}
                onClick={() => setTierFilter(tf)}
                className={`text-xs px-4 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all duration-200 ${
                  tierFilter === tf
                    ? 'bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] border-[var(--c-accent)] text-[var(--c-accent-text)] shadow-[var(--shadow-gold)]'
                    : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-accent)]/50 hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)]'
                }`}
              >
                {tf === 'all' ? t('allRanks') : tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>

          {roomsLoading ? (
            <div className="text-center text-[var(--c-muted)] py-16">
              <div className="inline-block w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin mb-3" />
              <div>{t('loading')}</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 glass rounded-2xl border-2 border-dashed border-[var(--c-border)]">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--c-elevated)] to-[var(--c-elevated-2)] border border-[var(--c-border)] mb-5">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  {[0,1,2,3,4].map(row => [0,1,2,3,4].map(col => (
                    <rect key={`${row}-${col}`} x={col * 8} y={row * 8} width="8" height="8"
                      fill={(row + col) % 2 === 0 ? 'var(--c-border)' : 'var(--c-elevated-2)'}
                      opacity="0.6"
                    />
                  )))}
                  <text x="20" y="26" textAnchor="middle" fontSize="14" fontFamily="'Noto Serif SC', serif" fontWeight="700" fill="var(--c-muted)">將</text>
                </svg>
              </div>
              <div className="text-[var(--c-text)] font-semibold mb-1 text-lg">{t('noRoomsYet')}</div>
              <div className="text-[var(--c-muted)] text-sm mb-5">{t('createFirst')}</div>
              {player && (
                <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
                  {t('createRoomBtn')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 stagger">
              {rooms.map(room => (
                <RoomCard key={room.roomId} room={room} onClick={() => handleJoinRoom(room)} />
              ))}
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 bg-gradient-to-b from-[var(--c-accent)] to-[var(--c-accent-active)] rounded-full" />
              <div>
                <h2 className="text-xl font-bold text-[var(--c-text)] tracking-tight flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {t('leaderboard') || 'Bảng xếp hạng'}
                </h2>
                {leaderboardTotal > 0 && (
                  <p className="text-xs text-[var(--c-muted)] mt-0.5">{leaderboardTotal} người chơi</p>
                )}
              </div>
            </div>
            <button
              onClick={refreshLeaderboard}
              className="text-xs text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[var(--c-elevated)]"
              disabled={leaderboardLoading}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={leaderboardLoading ? 'animate-spin' : ''}>
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {leaderboardLoading ? t('loading') : t('reload')}
            </button>
          </div>

          {leaderboardLoading && leaderboard.length === 0 ? (
            <div className="text-center text-[var(--c-muted)] py-12">
              <div className="inline-block w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin mb-3" />
              <div>{t('loading')}</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-[var(--c-muted)] py-12 glass rounded-2xl">
              {t('noLeaderboardYet') || 'Chưa có dữ liệu bảng xếp hạng'}
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="divide-y divide-[var(--c-border)]">
                {leaderboard.map((entry) => {
                  const medal = RANK_MEDAL[entry.rank]
                  const isTop3 = !!medal
                  return (
                    <div
                      key={`${entry.name}-${entry.rank}`}
                      className={`flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors ${
                        isTop3 ? '' : 'hover:bg-[var(--c-elevated)]/50'
                      }`}
                      style={isTop3 ? { background: medal.bg } : {}}
                    >
                      <div className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm flex-shrink-0 ${
                        isTop3
                          ? 'text-2xl'
                          : 'bg-[var(--c-elevated)] text-[var(--c-muted)]'
                      }`}>
                        {isTop3 ? medal.emoji : entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-[var(--c-text)]">
                          {entry.name}
                        </div>
                        <div className="text-[11px] text-[var(--c-muted)] mt-0.5 sm:hidden">
                          {entry.wins}W / {entry.totalGames}G · {entry.winRate}% WR
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right hidden sm:block">
                          <div className="text-[11px] text-[var(--c-muted)]">{entry.wins}W / {entry.totalGames}G</div>
                          <div className="text-[10px] text-[var(--c-dim)]">{entry.winRate}% WR</div>
                        </div>
                        <Badge tier={entry.tier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'} elo={entry.elo} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {leaderboardHasMore && (
                <button
                  onClick={loadMoreLeaderboard}
                  className="w-full py-3 text-xs text-[var(--c-muted)] hover:text-[var(--c-accent)] border-t border-[var(--c-border)] hover:bg-[var(--c-elevated)]/50 transition-colors cursor-pointer font-medium"
                >
                  Tải thêm ({leaderboardTotal - leaderboard.length} còn lại)
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--c-border)] mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--c-elevated)] border border-[var(--c-border)]">
              <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '14px', color: 'var(--c-accent)', fontWeight: 700 }}>將</span>
            </div>
            <div className="text-xs text-[var(--c-muted)]">
              © {new Date().getFullYear()} Cờ Tướng Online · Built with ❤
            </div>
          </div>
          <div className="text-xs text-[var(--c-muted)]">
            8 languages · MIT · Free forever
          </div>
        </div>
      </footer>

      {/* Registration modal */}
      <Modal open={needsName} title={t('welcome')} description={t('registerHint')} closeOnBackdrop={false} hideClose size="md">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--c-text)] mb-2 uppercase tracking-wider">{t('displayName')}</label>
            <input
              value={regName}
              onChange={e => { setRegName(e.target.value); setRegError('') }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder={t('namePlaceholder')}
              maxLength={16}
              autoFocus
              className="w-full bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-xl px-4 py-3 text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)] focus:bg-[var(--c-elevated-2)] focus:shadow-[0_0_0_3px_var(--c-accent-bg)] text-sm transition-all"
            />
            {regError && <p className="text-[var(--c-danger)] text-xs mt-2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {regError}
            </p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--c-text)] mb-2 uppercase tracking-wider">{t('chooseLanguage')}</label>
            <LanguageSelector value={regLang} onChange={setRegLang} />
          </div>
          <Button variant="primary" fullWidth size="lg" loading={regLoading} disabled={regName.trim().length < 2} onClick={handleRegister}>
            {t('startPlaying')}
          </Button>
        </div>
      </Modal>

      {/* Create room modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('createRoomTitle')} description="Thiết lập phòng của bạn">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--c-text)] mb-2 uppercase tracking-wider">{t('typeRoom')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['public', 'private'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setRoomType(type)}
                  className={`py-3 rounded-xl text-sm border transition-all font-medium ${
                    roomType === type
                      ? 'bg-[var(--c-accent-bg)] border-[var(--c-accent)] text-[var(--c-accent)] shadow-[var(--shadow-gold)]'
                      : 'bg-[var(--c-elevated)] border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)] hover:border-[var(--c-accent)]/50'
                  }`}
                >
                  {type === 'public' ? `🌐 ${t('public')}` : `🔒 ${t('private')}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--c-text)] mb-2 uppercase tracking-wider">{t('timeControl')}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeOptions.map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setTimeControl(opt.value)}
                  className={`py-2 rounded-lg text-xs border transition-all font-medium ${
                    timeControl === opt.value
                      ? 'bg-[var(--c-accent-bg)] border-[var(--c-accent)] text-[var(--c-accent)] shadow-[0_0_0_1px_var(--c-accent)]'
                      : 'bg-[var(--c-elevated)] border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)] hover:border-[var(--c-accent)]/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 py-1.5 px-1 glass rounded-xl">
            <Toggle
              checked={allowSpectators}
              onChange={setAllowSpectators}
              label="Cho phép người xem"
              description="Người khác có thể vào xem ván đấu"
            />
            <Toggle
              checked={allowTakeback}
              onChange={setAllowTakeback}
              label="Cho phép hoãn nước"
              description="Mỗi bên hoãn tối đa 3 lần"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowCreate(false)}>{t('cancel')}</Button>
            <Button variant="primary" fullWidth loading={creating} onClick={handleCreateRoom}>{t('createRoomBtn')}</Button>
          </div>
        </div>
      </Modal>

      {/* Join private room modal */}
      <Modal open={showJoin} onClose={() => { setShowJoin(false); setJoinCode(''); setJoinError('') }} title={t('joinModalTitle')} description={t('joinModalDesc')}>
        <div className="space-y-5">
          <div>
            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoinPrivate()}
              placeholder={t('roomCodePlaceholder')}
              maxLength={36}
              autoFocus
              className="w-full bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-xl px-4 py-4 text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)] focus:bg-[var(--c-elevated-2)] focus:shadow-[0_0_0_3px_var(--c-accent-bg)] text-base font-mono text-center uppercase tracking-widest transition-all"
            />
            {joinError && <p className="text-[var(--c-danger)] text-xs mt-2">{joinError}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowJoin(false)}>{t('cancel')}</Button>
            <Button variant="primary" fullWidth loading={joining} onClick={handleJoinPrivate}>{t('joinRoom')}</Button>
          </div>
        </div>
      </Modal>

      {/* Create tournament modal */}
      <Modal
        open={showCreateTournament}
        onClose={() => { setShowCreateTournament(false); setTournamentName(''); setTournamentError('') }}
        title="Tạo giải đấu"
        description="Mời bạn bè và tổ chức vòng tròn"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--c-text)] mb-2 uppercase tracking-wider">Tên giải đấu</label>
            <input
              value={tournamentName}
              onChange={e => { setTournamentName(e.target.value); setTournamentError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCreateTournament()}
              placeholder="VD: Giải xuân 2025"
              maxLength={60}
              autoFocus
              className="w-full bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-xl px-4 py-3 text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)] focus:bg-[var(--c-elevated-2)] focus:shadow-[0_0_0_3px_var(--c-accent-bg)] text-sm transition-all"
            />
            {tournamentError && <p className="text-[var(--c-danger)] text-xs mt-2">{tournamentError}</p>}
          </div>
          <div className="glass rounded-xl p-4 text-xs text-[var(--c-muted)] leading-relaxed">
            <div className="font-semibold text-[var(--c-text)] mb-2">📋 Thể lệ mặc định</div>
            <ul className="space-y-1">
              <li>• Hình thức: Vòng tròn (round-robin)</li>
              <li>• Thời gian: 20 phút / ván</li>
              <li>• Hòa: tính 1 điểm · Thắng: 3 điểm</li>
              <li>• Tối thiểu 3 người chơi</li>
            </ul>
            <p className="mt-2 text-[var(--c-dim)]">Bạn có thể tùy chỉnh thêm sau khi tạo.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowCreateTournament(false)}>Hủy</Button>
            <Button variant="gold" fullWidth loading={creatingTournament} onClick={handleCreateTournament}>
              Tạo giải đấu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
