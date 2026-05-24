'use client'

import { useEffect, useState } from 'react'
import { getOrCreateDeviceId, isFirstVisit, savePlayerName, detectLanguage, getSavedLanguage, saveLanguage } from '@/lib/player'
import type { PlayerProfile, Language } from '@/types'

export function usePlayer() {
  const [deviceId, setDeviceId] = useState('')
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsName, setNeedsName] = useState(false)

  useEffect(() => {
    const id = getOrCreateDeviceId()
    setDeviceId(id)

    async function init() {
      try {
        const res = await fetch(`/api/players/${id}`)
        const data = await res.json()
        if (data.exists) {
          setPlayer(data)
          savePlayerName(data.name)
          saveLanguage(data.preferences?.language ?? 'vi')
        } else {
          setNeedsName(true)
        }
      } catch {
        if (isFirstVisit()) setNeedsName(true)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  async function register(name: string, language: Language) {
    const id = getOrCreateDeviceId()
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: id, name, language }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Registration failed')
    }
    const data = await res.json()
    savePlayerName(name)
    saveLanguage(language)
    setPlayer(data)
    setNeedsName(false)
    return data
  }

  async function updateName(name: string) {
    const res = await fetch(`/api/players/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Update failed')
    }
    const data = await res.json()
    savePlayerName(name)
    setPlayer(data)
    return data
  }

  return { deviceId, player, loading, needsName, register, updateName }
}
