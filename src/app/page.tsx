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
      <header className="sticky top-0 z-10 bg-[var(--c-surface)] border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[var(--c-text)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              象棋 <span className="text-[var(--c-muted)] font-normal text-base">Cờ Tướng</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {player && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--c-text)] hidden sm:block">{player.name}</span>
                <Badge tier={player.ranking.tier} elo={player.ranking.elo} />
              </div>
            )}
            <ThemePicker />
            <LanguageSelector value={language} onChange={setLanguage} compact />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[var(--c-surface)] to-[var(--c-bg)] py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--c-text)] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {t('playOnline')}
            </h2>
            <p className="text-[var(--c-muted)] text-sm">{t('noLoginRequired')}</p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
            <Button variant="primary" size="lg" onClick={() => setShowCreate(true)} disabled={!player}>
              {t('createRoom')}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setShowJoin(true)} disabled={!player}>
              {t('joinByCode')}
            </Button>
          </div>
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--c-text)] font-semibold">{t('waitingRooms')}</h3>
          <button onClick={fetchRooms} className="text-[var(--c-muted)] hover:text-[var(--c-text)] text-sm transition-colors">
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
          <div className="text-center py-12">
            <div className="text-[var(--c-dim)] text-4xl mb-3">♟</div>
            <div className="text-[var(--c-muted)] text-sm">{t('noRoomsYet')}</div>
            <div className="text-[var(--c-muted)] text-xs mt-1">{t('createFirst')}</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map(room => (
              <RoomCard key={room.roomId} room={room} onClick={() => handleJoinRoom(room)} />
            ))}
          </div>
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
