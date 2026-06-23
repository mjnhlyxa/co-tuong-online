'use client'

import useSWR from 'swr'
import { useEffect, useRef } from 'react'
import type { GameState } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    if (data.status === 'waiting') return data
    throw new Error(data.error || 'not_found')
  }
  return data
}

export function useGameSWR(roomId: string, deviceId: string) {
  const { data, error, mutate } = useSWR<GameState>(
    roomId && deviceId ? `/api/games/${roomId}?deviceId=${deviceId}` : null,
    fetcher,
    { refreshInterval: 1000, dedupingInterval: 500, revalidateOnFocus: true }
  )

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!roomId || !deviceId) return
    if (data?.status === 'finished') {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      return
    }

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
    if (!data || data.status !== 'playing') return

    const previousData = data
    const optimisticGame = {
      ...data,
      boardState: data.boardState!.map((row: (string | null)[]) => [...row]),
    }
    const piece = optimisticGame.boardState[from.row][from.col]
    optimisticGame.boardState[to.row][to.col] = piece
    optimisticGame.boardState[from.row][from.col] = null
    optimisticGame.currentTurn = data.currentTurn === 'red' ? 'black' : 'red'

    mutate(optimisticGame, false)

    try {
      const res = await fetch(`/api/games/${roomId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, from, to, moveNumber: data.currentMoveNumber }),
      })
      const result = await res.json()
      if (!res.ok) {
        mutate(previousData, false)
        throw new Error(result.error || 'Move failed')
      }
      mutate()
      return result
    } catch (err) {
      mutate(previousData, false)
      throw err
    }
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