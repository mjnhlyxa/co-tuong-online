'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Board from '@/components/game/Board'
import PlayerPanel from '@/components/game/PlayerPanel'
import MoveHistory from '@/components/game/MoveHistory'
import GameSidebar from '@/components/game/GameSidebar'
import TakebackModal from '@/components/game/TakebackModal'
import GameResult from '@/components/game/GameResult'
import BottomActionBar from '@/components/game/BottomActionBar'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import LanguageSelector from '@/components/ui/LanguageSelector'
import ThemePicker from '@/components/ui/ThemePicker'
import CopyButton from '@/components/ui/CopyButton'
import { useGameSSE } from '@/hooks/useGameSSE'
import { usePlayer } from '@/hooks/usePlayer'
import { useI18n } from '@/hooks/useI18n'
import { isInCheck } from '@/lib/xiangqi/rules'
import type { Color, Language } from '@/types'

type Params = Promise<{ roomId: string }>

export default function GamePage({ params }: { params: Params }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { deviceId, player: playerData, loading: playerLoading, needsName, register } = usePlayer()
  const { language, setLanguage, t } = useI18n()
  const { game, loading, makeMove, resign, sendChat, requestTakeback, respondTakeback, mutePlayer } = useGameSSE(roomId, deviceId)

  const [showResult, setShowResult] = useState(false)
  const [roomJoined, setRoomJoined] = useState(false)
  // activePanel state removed - sidebar now shows all panels at once
  const [resignConfirm, setResignConfirm] = useState(false)
  const [showTakebackRejected, setShowTakebackRejected] = useState(false)
  const prevTakebackStatusRef = useRef<string | null>(null)

  // Registration modal state (for name input on game page)
  const [showRegModal, setShowRegModal] = useState(false)
  const [regName, setRegName] = useState('')
  const [regLang, setRegLang] = useState<Language>('vi')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Role selection modal state (play vs watch)
  const [showRoleSelect, setShowRoleSelect] = useState(false)
  const [roleSelectLoading, setRoleSelectLoading] = useState(false)
  const [pendingRole, setPendingRole] = useState<'player' | 'spectator' | null>(null)

  // Sync regLang to detected language
  useEffect(() => {
    if (!showRegModal) return
    setRegLang(language)
  }, [showRegModal, language])

  // Show registration modal when needsName becomes true
  useEffect(() => {
    if (needsName) setShowRegModal(true)
  }, [needsName])

  // Show role selection when room is waiting, user has a name, AND is NOT the host
  useEffect(() => {
    if (!game || !playerData || game.status !== 'waiting') {
      setShowRoleSelect(false)
      return
    }
    // Host is already a player - don't show role selection
    if (deviceId === game.host?.deviceId) {
      setShowRoleSelect(false)
      return
    }
    // Only show role select if we haven't selected a role yet
    if (pendingRole === null && !roomJoined) {
      setShowRoleSelect(true)
    }
  }, [game?.status, game?.host?.deviceId, deviceId, playerData, roomJoined, pendingRole])

  // Trigger room join based on selected role
  useEffect(() => {
    if (!deviceId || !playerData || roomJoined || !pendingRole) return
    setRoomJoined(true)

    if (pendingRole === 'spectator') {
      // Join as spectator - just call spectate API
      fetch(`/api/games/${roomId}/spectate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, name: playerData.name }),
      }).catch(() => {})
    } else {
      // Join as player - call rooms API to join as guest
      fetch(`/api/rooms/${roomId}?deviceId=${deviceId}`).catch(() => {})
    }
  }, [deviceId, playerData, roomId, roomJoined, pendingRole])

  // Join as spectator if playing and not a player
  useEffect(() => {
    if (!deviceId || !game || pendingRole === 'spectator') return
    const isPlayer = game.myColor !== null
    if (!isPlayer && game.allowSpectators && game.status === 'playing') {
      fetch(`/api/games/${roomId}/spectate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, name: playerData?.name }),
      }).catch(() => {})
    }
  }, [deviceId, game?.allowSpectators, game?.myColor, game?.status, roomId, playerData?.name, pendingRole])

  useEffect(() => {
    if (game?.status === 'finished') {
      setTimeout(() => setShowResult(true), 800)
    }
  }, [game?.status])

  useEffect(() => {
    const currentStatus = game?.takebackRequest?.status ?? null
    const fromColor = game?.takebackRequest?.fromColor
    if (
      currentStatus === 'rejected' &&
      fromColor === game?.myColor &&
      prevTakebackStatusRef.current === 'pending'
    ) {
      setShowTakebackRejected(true)
      const timer = setTimeout(() => setShowTakebackRejected(false), 3000)
      return () => clearTimeout(timer)
    }
    prevTakebackStatusRef.current = currentStatus
  }, [game?.takebackRequest?.status, game?.takebackRequest?.fromColor, game?.myColor])

  // ---- Registration handlers ----
  async function handleRegister() {
    const name = regName.trim()
    if (name.length < 2 || name.length > 16) {
      setRegError(t('nameError') || 'Tên phải từ 2-16 ký tự')
      return
    }
    setRegLoading(true)
    setRegError('')
    try {
      await register(name, regLang)
      setLanguage(regLang)
      setShowRegModal(false)
    } catch (e: unknown) {
      setRegError(e instanceof Error ? e.message : (t('genericError') || 'Có lỗi xảy ra'))
    } finally {
      setRegLoading(false)
    }
  }

  // ---- Role selection handlers ----
  function handleSelectRole(role: 'player' | 'spectator') {
    setPendingRole(role)
    setShowRoleSelect(false)
  }

  if (playerLoading || (loading && !game)) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center">
        <div className="text-[var(--c-muted)]">Đang tải...</div>
      </div>
    )
  }

  // Registration modal (shown when user has no name)
  if (showRegModal || needsName) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-surface)]/95 backdrop-blur">
          <button onClick={() => router.push('/')} className="text-[var(--c-muted)] hover:text-[var(--c-text)] text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.172 7H4a1 1 0 000 2h8.172l-2.122 2.121a1 1 0 001.414 1.415l3.243-3.243a1 1 0 000-1.414L13.464 4.636a1 1 0 00-1.414 1.414L12.172 7z" transform="rotate(180 8 8)"/>
            </svg>
            {t('backToLobby').replace('🏠 ', '')}
          </button>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <LanguageSelector value={language} onChange={setLanguage} compact />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-[var(--c-text)] mb-1">{t('welcome')}</h2>
            <p className="text-[var(--c-muted)] text-sm mb-4">{t('registerHint')}</p>
            <div className="space-y-4">
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
          </div>
        </div>
      </div>
    )
  }

  // Game not started yet — show role selection or waiting
  if (!game || game.status === 'waiting') {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-surface)]/95 backdrop-blur">
          <button onClick={() => router.push('/')} className="text-[var(--c-muted)] hover:text-[var(--c-text)] text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.172 7H4a1 1 0 000 2h8.172l-2.122 2.121a1 1 0 001.414 1.415l3.243-3.243a1 1 0 000-1.414L13.464 4.636a1 1 0 00-1.414 1.414L12.172 7z" transform="rotate(180 8 8)"/>
            </svg>
            {t('backToLobby').replace('🏠 ', '')}
          </button>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <LanguageSelector value={language} onChange={setLanguage} compact />
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[var(--c-accent-bg)] border-2 border-[var(--c-accent)]/30 flex items-center justify-center">
              <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '44px', color: 'var(--c-accent)', fontWeight: 700, lineHeight: 1 }}>將</span>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[var(--c-accent)]/40 animate-ping" />
          </div>
          <div>
            <div className="text-[var(--c-text)] text-xl font-semibold mb-2">{t('waitingForOpponentToJoin')}</div>
            <div className="text-[var(--c-muted)] text-sm">{t('shareLink').replace('🔗 ', '')} — {t('copyLink').toLowerCase()}</div>
          </div>
          {typeof window !== 'undefined' && (
            <div className="flex items-center gap-2 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl px-4 py-3 shadow-sm max-w-sm w-full">
              <code className="text-[var(--c-accent)] text-sm flex-1 truncate text-left">{window.location.href}</code>
              <CopyButton text={window.location.href} label={t('copyLink')} />
            </div>
          )}
          <Button variant="secondary" onClick={() => router.push('/')}>{t('backToLobby').replace('🏠 ', '')}</Button>
        </div>

        {/* Role selection modal */}
        <Modal open={showRoleSelect} onClose={() => { setShowRoleSelect(false); router.push('/') }} title={t('joinAs') || 'Tham gia với tư cách'}>
          <div className="space-y-3">
            <p className="text-[var(--c-muted)] text-sm">{t('joinAsDesc') || 'Bạn muốn tham gia với tư cách nào?'}</p>
            <button
              onClick={() => handleSelectRole('player')}
              className="w-full py-4 px-4 rounded-xl border-2 border-[var(--c-accent)] bg-[var(--c-accent-bg)] text-left hover:bg-[var(--c-accent)]/10 transition-colors cursor-pointer"
            >
              <div className="text-[var(--c-accent)] font-semibold text-base">🎮 {t('playAsOpponent') || 'Chơi như đối thủ'}</div>
              <div className="text-[var(--c-muted)] text-xs mt-1">{t('playAsOpponentDesc') || 'Vào chơi cờ với chủ phòng'}</div>
            </button>
            <button
              onClick={() => handleSelectRole('spectator')}
              className="w-full py-4 px-4 rounded-xl border-2 border-[var(--c-border)] text-left hover:border-[var(--c-muted)] transition-colors cursor-pointer"
            >
              <div className="text-[var(--c-text)] font-semibold text-base">👁 {t('watchAsSpectator') || 'Xem như khán giả'}</div>
              <div className="text-[var(--c-muted)] text-xs mt-1">{t('watchAsSpectatorDesc') || 'Theo dõi ván đấu mà không chơi'}</div>
            </button>
          </div>
        </Modal>
      </div>
    )
  }

  // At this point, game is in 'playing' or 'finished' state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playingGame = game as any

  const myColor = playingGame.myColor
  const isPlayer = myColor !== null
  const isHost = myColor === 'red'
  const topColor: Color = myColor === 'black' ? 'red' : 'black'
  const bottomColor: Color = myColor === 'black' ? 'black' : 'red'

  const boardInCheck = isInCheck(playingGame.boardState, playingGame.currentTurn)

  const takebacksUsedByMe = myColor ? playingGame.takebacksUsed[myColor] : 0
  const canTakeback = isPlayer &&
    playingGame.currentTurn !== myColor &&
    !playingGame.takebackRequest &&
    takebacksUsedByMe < 3 &&
    playingGame.currentMoveNumber > 0

  async function handleMove(from: { row: number; col: number }, to: { row: number; col: number }) {
    try {
      await makeMove(from, to)
    } catch { /* ignore client validation errors */ }
  }

  async function handleResign() {
    if (!resignConfirm) { setResignConfirm(true); return }
    try { await resign() } catch {}
    setResignConfirm(false)
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game/${roomId}`
    : `/game/${roomId}`

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--c-border)] bg-[var(--c-surface)]/95 backdrop-blur">
        <button onClick={() => router.push('/')} className="text-[var(--c-muted)] hover:text-[var(--c-text)] flex items-center gap-1.5 text-sm transition-colors cursor-pointer">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.828 7H12a1 1 0 110 2H3.828l2.122 2.121a1 1 0 11-1.414 1.415L1.293 9.293a1 1 0 010-1.414l3.243-3.243a1 1 0 011.414 1.414L3.828 7z" />
          </svg>
          {t('backToLobby').replace('🏠 ', '')}
        </button>
        <div className="flex items-center gap-1.5 text-[var(--c-muted)] text-xs font-mono bg-[var(--c-elevated)] border border-[var(--c-border)] px-2 py-1 rounded hidden sm:flex">
          #{roomId.slice(0, 8)}
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={shareUrl} label={t('shareLink').replace('🔗 ', '')} />
          <ThemePicker />
          <LanguageSelector value={language} onChange={setLanguage} compact />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Board area */}
        <div className="flex flex-col flex-1 items-center px-2 py-1 sm:py-3 gap-1 sm:gap-2 overflow-auto">
          {/* Opponent panel (top) */}
          <div className="w-full max-w-[520px]">
            <PlayerPanel game={playingGame} color={topColor} position="top" isMyColor={false} />
          </div>

          {/* Board */}
          <div className="flex-shrink-0">
            <Board
              board={playingGame.boardState}
              myColor={myColor}
              currentTurn={playingGame.currentTurn}
              lastMove={playingGame.moves[playingGame.moves.length - 1] ?? null}
              isInCheck={boardInCheck}
              disabled={!isPlayer || playingGame.currentTurn !== myColor || playingGame.status !== 'playing'}
              onMove={handleMove}
            />
          </div>

          {/* My panel (bottom) */}
          <div className="w-full max-w-[520px]">
            <PlayerPanel game={playingGame} color={bottomColor} position="bottom" isMyColor={!!myColor} />
          </div>

          {/* Action buttons (desktop/tablet, hidden on mobile) */}
          {isPlayer && playingGame.status === 'playing' && (
            <div className="hidden sm:flex items-center gap-2 mt-1">
              {playingGame.allowTakeback && canTakeback && (
                <Button variant="secondary" size="sm" onClick={requestTakeback}>
                  ↩ {t('requestTakeback')} ({3 - takebacksUsedByMe} {t('takebacksLeft')})
                </Button>
              )}
              {resignConfirm ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setResignConfirm(false)}>{t('cancel')}</Button>
                  <Button variant="danger" size="sm" onClick={handleResign}>{t('confirmResign')}</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleResign}>🏳 {t('resign')}</Button>
              )}
            </div>
          )}
        </div>

        {/* Side panel - Right side (desktop only): All 3 panels always visible */}
        <aside className="hidden lg:flex flex-col w-80 border-l border-[var(--c-border)] bg-[var(--c-surface)] overflow-hidden">
          <GameSidebar
            messages={playingGame.chat}
            spectators={playingGame.spectators}
            moves={playingGame.moves}
            mutedDeviceIds={playingGame.mutedDeviceIds}
            isHost={isHost}
            deviceId={deviceId}
            onSend={sendChat}
            onMute={mutePlayer}
            t={t}
          />
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden pb-16">
        <BottomActionBar
          game={playingGame}
          myColor={myColor}
          deviceId={deviceId}
          onSendChat={sendChat}
          onMute={mutePlayer}
          onRequestTakeback={requestTakeback}
          onResign={handleResign}
          takebacksUsed={takebacksUsedByMe}
          canTakeback={canTakeback}
        />
      </div>

      {/* Takeback rejected toast */}
      {showTakebackRejected && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[var(--c-border)] border border-[var(--c-dim)] text-[var(--c-text)] text-sm px-4 py-2.5 rounded-lg shadow-lg whitespace-nowrap">
          {t('takebackRejected')}
        </div>
      )}

      {/* Takeback modal */}
      <TakebackModal
        request={playingGame.takebackRequest}
        myColor={myColor}
        onAccept={() => respondTakeback(true)}
        onReject={() => respondTakeback(false)}
      />

      {/* Game result */}
      {showResult && (
        <GameResult
          game={playingGame}
          myColor={myColor}
          onClose={() => { setShowResult(false); router.push('/') }}
        />
      )}
    </div>
  )
}