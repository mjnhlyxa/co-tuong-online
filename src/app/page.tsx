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

  // Registration modal state
  const [regName, setRegName] = useState('')
  const [regLang, setRegLang] = useState<Language>('vi')
  const regLangInitRef = useRef(false)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Sync regLang to detected language once on first load
  useEffect(() => {
    if (!regLangInitRef.current) {
      setRegLang(language)
      regLangInitRef.current = true
    }
  }, [language])

  // Create room modal
  const [showCreate, setShowCreate] = useState(false)
  const [roomType, setRoomType] = useState<'public' | 'private'>('public')
  const [timeControl, setTimeControl] = useState<number | null>(1800000)
  const [allowSpectators, setAllowSpectators] = useState(true)
  const [allowTakeback, setAllowTakeback] = useState(true)
  const [creating, setCreating] = useState(false)

  // Join private modal
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

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
    const interval = setInterval(fetchLeaderboard, 30000) // Poll every 30s
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

  function handleJoinRoom(room: RoomInfo) {
    router.push(`/game/${room.roomId}`)
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--c-surface)]/95 backdrop-blur border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--c-accent-bg)] border border-[var(--c-accent)]/25 flex-shrink-0">
              <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '17px', lineHeight: '1', color: 'var(--c-accent)', fontWeight: 700 }}>將</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--c-text)] leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Cờ Tướng Online</div>
              <div className="text-[10px] text-[var(--c-muted)] leading-none">Xiangqi · 象棋</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {player && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--c-text)] hidden sm:block font-medium">{player.name}</span>
                <Badge tier={player.ranking.tier} elo={player.ranking.elo} />
              </div>
            )}
            <ThemePicker />
            <LanguageSelector value={language} onChange={setLanguage} compact />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[var(--c-surface)] to-[var(--c-bg)] border-b border-[var(--c-border)] py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            {!roomsLoading && (
              <div className="inline-flex items-center gap-1.5 bg-[var(--c-accent-bg)] border border-[var(--c-accent)]/30 text-[var(--c-accent)] text-xs font-medium px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] animate-pulse inline-block" />
                {rooms.length > 0 ? `${rooms.length} phòng đang chờ` : 'Không có phòng đang chờ'}
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--c-text)] mb-3 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {t('playOnline')}
            </h2>
            <p className="text-[var(--c-muted)]">{t('noLoginRequired')}</p>
            <div className="flex gap-3 mt-6 justify-center sm:justify-start flex-wrap">
              <Button variant="primary" size="lg" onClick={() => setShowCreate(true)} disabled={!player}>
                {t('createRoom')}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setShowJoin(true)} disabled={!player}>
                {t('joinByCode')}
              </Button>
            </div>
          </div>
          {/* Decorative chess board */}
          <div className="hidden sm:block opacity-50 flex-shrink-0">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
              {Array.from({ length: 64 }, (_, i) => {
                const row = Math.floor(i / 8), col = i % 8
                const isLight = (row + col) % 2 === 0
                return <rect key={i} x={col * 12} y={row * 12} width="12" height="12" fill={isLight ? '#c8a96e' : '#8b6914'} />
              })}
              <text x="48" y="56" textAnchor="middle" fontSize="28" fontFamily="'Noto Serif SC', serif" fontWeight="700" fill="white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>將</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[var(--c-text)] font-semibold">{t('waitingRooms')}</h3>
            {!roomsLoading && rooms.length > 0 && (
              <span className="text-xs bg-[var(--c-elevated)] text-[var(--c-muted)] px-2 py-0.5 rounded-full font-medium">{rooms.length}</span>
            )}
          </div>
          <button onClick={fetchRooms} className="text-[var(--c-muted)] hover:text-[var(--c-text)] text-xs transition-colors flex items-center gap-1 cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            {t('reload')}
          </button>
        </div>

        {/* Tier filter chips */}
        <div className="flex gap-2 overflow-x-auto mb-4 pb-0.5 scrollbar-none">
          {TIER_FILTERS.map(tf => (
            <button
              key={tf}
              onClick={() => setTierFilter(tf)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                tierFilter === tf
                  ? 'bg-[var(--c-accent)] border-[var(--c-accent)] text-[var(--c-accent-text)]'
                  : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-text)]'
              }`}
            >
              {tf === 'all' ? t('allRanks') : tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>

        {roomsLoading ? (
          <div className="text-center text-[var(--c-muted)] py-12">{t('loading')}</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--c-elevated)] border border-[var(--c-border)] mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                {[0,1,2,3].map(row => [0,1,2,3].map(col => (
                  <rect key={`${row}-${col}`} x={col * 8} y={row * 8} width="8" height="8"
                    fill={(row + col) % 2 === 0 ? 'var(--c-border)' : 'var(--c-elevated)'}
                    opacity="0.8"
                  />
                )))}
                <text x="16" y="20" textAnchor="middle" fontSize="12" fontFamily="'Noto Serif SC', serif" fontWeight="700" fill="var(--c-muted)">將</text>
              </svg>
            </div>
            <div className="text-[var(--c-text)] font-medium mb-1">{t('noRoomsYet')}</div>
            <div className="text-[var(--c-muted)] text-sm">{t('createFirst')}</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map(room => (
              <RoomCard key={room.roomId} room={room} onClick={() => handleJoinRoom(room)} />
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="max-w-5xl mx-auto w-full px-4 py-6 border-t border-[var(--c-border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--c-text)] font-semibold flex items-center gap-2">
            🏆 {t('leaderboard') || 'Bảng xếp hạng'}
            {leaderboardTotal > 0 && (
              <span className="text-xs text-[var(--c-muted)] font-normal">({leaderboardTotal} players)</span>
            )}
          </h3>
          <button
            onClick={refreshLeaderboard}
            className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] flex items-center gap-1 transition-colors cursor-pointer"
            disabled={leaderboardLoading}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={leaderboardLoading ? 'animate-spin' : ''}>
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {leaderboardLoading ? t('loading') : t('reload')}
          </button>
        </div>

        {leaderboardLoading && leaderboard.length === 0 ? (
          <div className="text-center text-[var(--c-muted)] py-8">{t('loading')}</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-[var(--c-muted)] py-8 text-sm">{t('noLeaderboardYet') || 'Chưa có dữ liệu bảng xếp hạng'}</div>
        ) : (
          <>
            <div className="space-y-1">
              {leaderboard.map((entry) => {
                const isTop3 = entry.rank <= 3
                return (
                  <div
                    key={`${entry.name}-${entry.rank}`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isTop3 ? (
                        entry.rank === 1 ? 'bg-yellow-400/10 border border-yellow-400/30' :
                        entry.rank === 2 ? 'bg-gray-300/10 border border-gray-300/30' :
                        'bg-amber-400/10 border border-amber-400/30'
                      ) : 'hover:bg-[var(--c-elevated)]'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm ${
                      entry.rank === 1 ? 'bg-yellow-400/20 text-yellow-400' :
                      entry.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                      entry.rank === 3 ? 'bg-amber-400/20 text-amber-400' :
                      'bg-[var(--c-elevated)] text-[var(--c-muted)]'
                    }`}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-[var(--c-text)]">
                        {entry.name}
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-[var(--c-muted)]">
                      <div className="text-right">
                        <div className="font-medium text-[var(--c-accent)]">{entry.elo}</div>
                        <div className="text-[10px]">ELO</div>
                      </div>
                      <Badge tier={entry.tier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'} elo={entry.elo} />
                      <div className="text-right hidden sm:block">
                        <div>{entry.wins}W / {entry.totalGames}G</div>
                        <div className="text-[10px]">{entry.winRate}% WR</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {leaderboardHasMore && (
              <button
                onClick={loadMoreLeaderboard}
                className="w-full mt-3 py-2 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)] hover:border-[var(--c-accent)]/50 rounded-lg transition-colors cursor-pointer"
              >
                Load more ({leaderboardTotal - leaderboard.length} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* Registration modal */}
      <Modal open={needsName} title={t('welcome')} closeOnBackdrop={false}>
        <div className="space-y-4">
          <p className="text-[var(--c-muted)] text-sm">{t('registerHint')}</p>
          <div>
            <label className="block text-xs text-[var(--c-muted)] mb-1">{t('displayName')}</label>
            <input
              value={regName}
              onChange={e => { setRegName(e.target.value); setRegError('') }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder={t('namePlaceholder')}
              maxLength={16}
              autoFocus
              className="w-full bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)] text-sm"
            />
            {regError && <p className="text-[var(--c-danger)] text-xs mt-1">{regError}</p>}
          </div>
          <div>
            <label className="block text-xs text-[var(--c-muted)] mb-1">{t('chooseLanguage')}</label>
            <LanguageSelector value={regLang} onChange={setRegLang} />
          </div>
          <Button variant="primary" className="w-full" loading={regLoading} disabled={regName.trim().length < 2} onClick={handleRegister}>
            {t('startPlaying')}
          </Button>
        </div>
      </Modal>

      {/* Create room modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('createRoomTitle')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--c-muted)] mb-2">{t('typeRoom')}</label>
            <div className="flex gap-2">
              {(['public', 'private'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setRoomType(type)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    roomType === type
                      ? 'bg-[var(--c-accent-bg)] border-[var(--c-accent)] text-[var(--c-accent)]'
                      : 'bg-[var(--c-elevated)] border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)]'
                  }`}
                >
                  {type === 'public' ? `🌐 ${t('public')}` : `🔒 ${t('private')}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--c-muted)] mb-2">{t('timeControl')}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeOptions.map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setTimeControl(opt.value)}
                  className={`py-1.5 rounded text-xs border transition-colors ${
                    timeControl === opt.value
                      ? 'bg-[var(--c-accent-bg)] border-[var(--c-accent)] text-[var(--c-accent)]'
                      : 'bg-[var(--c-elevated)] border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 py-1">
            <Toggle
              checked={allowSpectators}
              onChange={setAllowSpectators}
              label={t('allowSpectators')}
            />
            <Toggle
              checked={allowTakeback}
              onChange={setAllowTakeback}
              label={`${t('allowTakeback')} (${t('takebackDesc')})`}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>{t('cancel')}</Button>
            <Button variant="primary" className="flex-1" loading={creating} onClick={handleCreateRoom}>
              {t('createRoomBtn')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join private room modal */}
      <Modal open={showJoin} onClose={() => { setShowJoin(false); setJoinCode(''); setJoinError('') }} title={t('joinModalTitle')}>
        <div className="space-y-4">
          <p className="text-[var(--c-muted)] text-sm">{t('joinModalDesc')}</p>
          <div>
            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoinPrivate()}
              placeholder={t('roomCodePlaceholder')}
              maxLength={36}
              autoFocus
              className="w-full bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] placeholder-[var(--c-dim)] focus:outline-none focus:border-[var(--c-accent)] text-sm font-mono text-center"
            />
            {joinError && <p className="text-[var(--c-danger)] text-xs mt-1">{joinError}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowJoin(false)}>{t('cancel')}</Button>
            <Button variant="primary" className="flex-1" loading={joining} onClick={handleJoinPrivate}>
              {t('joinRoom')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
