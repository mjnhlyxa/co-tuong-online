'use client'

import useSWR from 'swr'
import { useEffect, useRef } from 'react'
import type { GameState } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('not_found')
  return res.json()
}

export function useGame(roomId: string, deviceId: string) {
  const { data, error, mutate } = useSWR<GameState>(
    roomId ? `/api/games/${roomId}?deviceId=${deviceId}` : null,
    fetcher,
    { refreshInterval: 1500, dedupingInterval: 500 }
  )

  // Heartbeat every 20s
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!roomId || !deviceId) return
    if (data?.status === 'finished') return

    heartbeatRef.current = setInterval(() => {
      fetch(`/api/games/${roomId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      }).catch(() => {})
    }, 20000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [roomId, deviceId, data?.status])

  async function makeMove(from: { row: number; col: number }, to: { row: number; col: number }) {
    if (!data) return
    const res = await fetch(`/api/games/${roomId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, from, to, moveNumber: data.currentMoveNumber }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Move failed')
    mutate()
    return result
  }

  async function resign() {
    const res = await fetch(`/api/games/${roomId}/resign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Resign failed')
    mutate()
    return result
  }

  async function sendChat(message: string) {
    const res = await fetch(`/api/games/${roomId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, message }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Chat failed')
    mutate()
  }

  async function requestTakeback() {
    const res = await fetch(`/api/games/${roomId}/takeback-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Takeback request failed')
    mutate()
  }

  async function respondTakeback(accept: boolean) {
    const res = await fetch(`/api/games/${roomId}/takeback-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, accept }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Takeback response failed')
    mutate()
  }

  async function mutePlayer(targetDeviceId: string, mute: boolean) {
    const res = await fetch(`/api/games/${roomId}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostDeviceId: deviceId, targetDeviceId, action: mute ? 'mute' : 'unmute' }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Mute failed')
    mutate()
  }

  return {
    game: data ?? null,
    loading: !data && !error,
    error,
    mutate,
    makeMove,
    resign,
    sendChat,
    requestTakeback,
    respondTakeback,
    mutePlayer,
  }
}
