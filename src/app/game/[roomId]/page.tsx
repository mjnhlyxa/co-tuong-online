'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Board from '@/components/game/Board'
import PlayerPanel from '@/components/game/PlayerPanel'
import MoveHistory from '@/components/game/MoveHistory'
import ChatPanel from '@/components/game/ChatPanel'
import SpectatorList from '@/components/game/SpectatorList'
import TakebackModal from '@/components/game/TakebackModal'
import GameResult from '@/components/game/GameResult'
import BottomActionBar from '@/components/game/BottomActionBar'
import Button from '@/components/ui/Button'
import LanguageSelector from '@/components/ui/LanguageSelector'
import ThemePicker from '@/components/ui/ThemePicker'
import CopyButton from '@/components/ui/CopyButton'
import { useGame } from '@/hooks/useGame'
import { usePlayer } from '@/hooks/usePlayer'
import { useI18n } from '@/hooks/useI18n'
import { isInCheck } from '@/lib/xiangqi/rules'
import type { Color } from '@/types'

type Params = Promise<{ roomId: string }>

export default function GamePage({ params }: { params: Params }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { deviceId, loading: playerLoading } = usePlayer()
  const { language, setLanguage, t } = useI18n()
  const { game, loading, makeMove, resign, sendChat, requestTakeback, respondTakeback, mutePlayer } = useGame(roomId, deviceId)

  const [showResult, setShowResult] = useState(false)
  const [roomJoined, setRoomJoined] = useState(false)
  const [activePanel, setActivePanel] = useState<'moves' | 'chat' | 'spectators'>('moves')
  const [resignConfirm, setResignConfirm] = useState(false)
  const [showTakebackRejected, setShowTakebackRejected] = useState(false)
  const prevTakebackStatusRef = useRef<string | null>(null)

  // Trigger room join (auto-joins as guest if waiting)
  useEffect(() => {
    if (!deviceId || roomJoined) return
    setRoomJoined(true)
    fetch(`/api/rooms/${roomId}?deviceId=${deviceId}`).catch(() => {})
  }, [deviceId, roomId, roomJoined])

  // Join as spectator if not a player
  useEffect(() => {
    if (!deviceId || !game) return
    const isPlayer = game.myColor !== null
    if (!isPlayer && game.allowSpectators) {
      fetch(`/api/games/${roomId}/spectate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      }).catch(() => {})
    }
  }, [deviceId, game?.allowSpectators, game?.myColor, roomId])

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

  if (playerLoading || (loading && !game)) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center">
        <div className="text-[var(--c-muted)]">Đang tải...</div>
      </div>
    )
  }

  // Game not started yet — host is waiting for opponent
  if (!game) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-surface)]/95 backdrop-blur">
          <button onClick={() => router.push('/')} className="text-[var(--c-muted)] hover:text-[var(--c-text)] text-sm flex items-center gap-1.5 transition-colors">
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
      </div>
    )
  }

  const myColor = game.myColor
  const isPlayer = myColor !== null
  const isHost = myColor === 'red'
  const topColor: Color = myColor === 'black' ? 'red' : 'black'
  const bottomColor: Color = myColor === 'black' ? 'black' : 'red'

  const boardInCheck = isInCheck(game.boardState, game.currentTurn)

  const takebacksUsedByMe = myColor ? game.takebacksUsed[myColor] : 0
  const canTakeback = isPlayer &&
    game.currentTurn !== myColor &&
    !game.takebackRequest &&
    takebacksUsedByMe < 3 &&
    game.currentMoveNumber > 0

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
        <button onClick={() => router.push('/')} className="text-[var(--c-muted)] hover:text-[var(--c-text)] flex items-center gap-1.5 text-sm transition-colors">
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
            <PlayerPanel game={game} color={topColor} position="top" />
          </div>

          {/* Board */}
          <div className="flex-shrink-0">
            <Board
              board={game.boardState}
              myColor={myColor}
              currentTurn={game.currentTurn}
              lastMove={game.moves[game.moves.length - 1] ?? null}
              isInCheck={boardInCheck}
              disabled={!isPlayer || game.currentTurn !== myColor || game.status !== 'playing'}
              onMove={handleMove}
            />
          </div>

          {/* My panel (bottom) */}
          <div className="w-full max-w-[520px]">
            <PlayerPanel game={game} color={bottomColor} position="bottom" />
          </div>

          {/* Action buttons (desktop/tablet, hidden on mobile) */}
          {isPlayer && game.status === 'playing' && (
            <div className="hidden sm:flex items-center gap-2 mt-1">
              {game.allowTakeback && canTakeback && (
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

        {/* Side panel (desktop only) */}
        <aside className="hidden lg:flex flex-col w-80 border-l border-[var(--c-border)] bg-[var(--c-surface)]">
          {/* Tabs */}
          <div className="flex border-b border-[var(--c-border)]">
            {(['moves', 'chat', 'spectators'] as const).map(panel => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activePanel === panel
                    ? 'text-[var(--c-accent)] border-b-2 border-[var(--c-accent)]'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)]'
                }`}
              >
                {panel === 'moves' && `📜 ${t('moveHistory')}`}
                {panel === 'chat' && `💬 ${t('chat')}${game.chat.length > 0 ? ` (${game.chat.length})` : ''}`}
                {panel === 'spectators' && `👁 ${t('spectators')} (${game.spectators.length})`}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {activePanel === 'moves' && <MoveHistory moves={game.moves} />}
            {activePanel === 'chat' && (
              <ChatPanel
                messages={game.chat}
                deviceId={deviceId}
                mutedDeviceIds={game.mutedDeviceIds}
                isHost={isHost}
                onSend={sendChat}
                onMute={mutePlayer}
              />
            )}
            {activePanel === 'spectators' && <SpectatorList spectators={game.spectators} />}
          </div>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden pb-16">
        <BottomActionBar
          game={game}
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
        request={game.takebackRequest}
        myColor={myColor}
        onAccept={() => respondTakeback(true)}
        onReject={() => respondTakeback(false)}
      />

      {/* Game result */}
      {showResult && (
        <GameResult
          game={game}
          myColor={myColor}
          onClose={() => { setShowResult(false); router.push('/') }}
        />
      )}
    </div>
  )
}
