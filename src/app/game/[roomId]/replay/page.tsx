'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ReplayView from '@/components/game/ReplayView'
import Icon, { type IconName } from '@/components/ui/Icon'
import { getInitialBoard } from '@/lib/xiangqi/board'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import type { MoveRecord } from '@/types'

interface ServerGame {
  redPlayer: { name: string; deviceId: string }
  blackPlayer: { name: string; deviceId: string }
  moves: MoveRecord[]
  status: 'playing' | 'finished'
  winner: 'red' | 'black' | 'draw' | null
  endReason: string | null
  startedAt: string
  finishedAt: string | null
}

export default function ReplayPage() {
  const router = useRouter()
  const params = useParams<{ roomId: string }>()
  const [game, setGame] = useState<ServerGame | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params?.roomId) return
    fetch(`/api/games/${params.roomId}`)
      .then(r => r.json())
      .then(data => {
        if (data.status !== 'finished') {
          router.push(`/game/${params.roomId}`)
          return
        }
        setGame(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params?.roomId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="text-2xl font-bold mb-2">Không tìm thấy ván đấu</div>
        <button onClick={() => router.push('/')} className="text-[var(--c-accent)] hover:underline">
          Về lobby
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 glass-panel-strong border-b border-[var(--c-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-text)]">
            <Icon name="back" size={14} /> Quay lại
          </button>
          <h1 className="font-bold text-[var(--c-text)] tracking-tight flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Icon name="history" size={16} className="text-[var(--c-accent)]" />
            Xem lại ván đấu
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <ReplayView
          moves={game.moves || []}
          redPlayer={game.redPlayer}
          blackPlayer={game.blackPlayer}
          result={{ winner: game.winner, endReason: game.endReason }}
        />
      </main>
    </div>
  )
}
