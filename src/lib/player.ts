import { v4 as uuidv4 } from 'uuid'
import type { Language } from '@/types'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('deviceId')
  if (!id) {
    id = uuidv4()
    localStorage.setItem('deviceId', id)
  }
  return id
}

export function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'vi'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('vi')) return 'vi'
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('ko')) return 'ko'
  if (lang.startsWith('ru')) return 'ru'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('pt')) return 'pt'
  return 'en'
}

export function getSavedLanguage(): Language | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem('language') as Language) || null
}

export function saveLanguage(lang: Language) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang)
  }
}

export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem('playerName')
}

export function savePlayerName(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('playerName', name)
  }
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('playerName') || ''
}
