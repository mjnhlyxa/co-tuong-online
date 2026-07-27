'use client'

import { useEffect, useState, useCallback } from 'react'

export interface Settings {
  theme: 'dark' | 'light' | 'pink' | 'sky'
  language: string
  sound: boolean
  soundVolume: number
  boardStyle: '2d' | '3d'
  showCoordinates: boolean
}

const DEFAULTS: Settings = {
  theme: 'dark',
  language: 'vi',
  sound: true,
  soundVolume: 0.5,
  boardStyle: '2d',
  showCoordinates: false,
}

const STORAGE_KEY = 'co_tuong_settings_v1'

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return { ...DEFAULTS, ...parsed }
    }
  } catch {}
  return DEFAULTS
}

function saveSettings(s: Settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      saveSettings(settings)
      // Apply theme immediately
      document.documentElement.setAttribute('data-theme', settings.theme)
    }
  }, [settings, hydrated])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULTS)
  }, [])

  return { settings, update, reset, hydrated }
}
