'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameState } from '@/types'

export function useGameSSE(roomId: string, deviceId: string) {
  const [game, setGame] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!roomId || !deviceId) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource(`/api/games/${roomId}/stream?deviceId=${deviceId}`)
    eventSourceRef.current = es

    es.addEventListener('update', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.error === 'ROOM_NOT_FOUND') {
          setError('ROOM_NOT_FOUND')
          setLoading(false)
          return
        }
        setGame(data)
        setLoading(false)
        setError(null)
      } catch {}
    })

    es.addEventListener('error', (e) => {
      console.error('SSE error:', e)
      setError('Connection error')
    })

    es.onerror = () => {
      es.close()
      // Reconnect after 1s
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 1000)
    }
  }, [roomId, deviceId])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  // Heartbeat every 20s
  useEffect(() => {
    if (!roomId || !deviceId) return
    if (game?.status === 'finished') return

    const heartbeat = setInterval(() => {
      fetch(`/api/games/${roomId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      }).catch(() => {})
    }, 20000)

    return () => clearInterval(heartbeat)
  }, [roomId, deviceId, game?.status])

  async function makeMove(from: { row: number; col: number }, to: { row: number; col: number }) {
    if (!game || game.status !== 'playing') return

    const previousData = game
    const optimisticGame = {
      ...game,
      boardState: game.boardState!.map((row: (string | null)[]) => [...row]),
    }
    const piece = optimisticGame.boardState[from.row][from.col]
    optimisticGame.boardState[to.row][to.col] = piece
    optimisticGame.boardState[from.row][from.col] = null
    optimisticGame.currentTurn = game.currentTurn === 'red' ? 'black' : 'red'

    setGame(optimisticGame)

    try {
      const res = await fetch(`/api/games/${roomId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, from, to, moveNumber: game.currentMoveNumber }),
      })
      const result = await res.json()
      if (!res.ok) {
        setGame(previousData)
        throw new Error(result.error || 'Move failed')
      }
      return result
    } catch (err) {
      setGame(previousData)
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
    return result
  }

  async function requestTakeback() {
    const res = await fetch(`/api/games/${roomId}/takeback-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Takeback request failed')
    return result
  }

  async function respondTakeback(accept: boolean) {
    const res = await fetch(`/api/games/${roomId}/takeback-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, accept }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Takeback response failed')
    return result
  }

  async function mutePlayer(targetDeviceId: string, mute: boolean) {
    const res = await fetch(`/api/games/${roomId}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostDeviceId: deviceId, targetDeviceId, action: mute ? 'mute' : 'unmute' }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Mute failed')
    return result
  }

  return {
    game,
    loading,
    error,
    makeMove,
    resign,
    sendChat,
    requestTakeback,
    respondTakeback,
    mutePlayer,
  }
}