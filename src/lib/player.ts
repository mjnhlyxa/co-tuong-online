import { v4 as uuidv4 } from 'uuid'
import type { Language } from '@/types'

const STORAGE_KEY = 'co_tuong_player_v2'

interface StoredPlayer {
  deviceId: string
  name: string
  language: Language
}

/** Migrate old separate keys to single key (one-time) */
function migrateLegacy(): StoredPlayer | null {
  if (typeof window === 'undefined') return null
  const oldName = localStorage.getItem('playerName')
  const oldDev = localStorage.getItem('deviceId')
  const oldLang = localStorage.getItem('language') as Language | null
  if (oldName || oldDev) {
    const p: StoredPlayer = {
      deviceId: oldDev || uuidv4(),
      name: oldName || '',
      language: oldLang || 'vi',
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
      localStorage.removeItem('playerName')
      localStorage.removeItem('deviceId')
      localStorage.removeItem('language')
    } catch {}
    return p.name ? p : null
  }
  return null
}

function load(): StoredPlayer | null {
  if (typeof window === 'undefined') return null
  // Try new key first
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredPlayer
  } catch {}
  // Fall back to migration
  return migrateLegacy()
}

function save(p: StoredPlayer) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

export function getOrCreateDeviceId(): string {
  const p = load()
  if (p?.deviceId) return p.deviceId
  // Bootstrap new device ID
  if (typeof window === 'undefined') return ''
  const id = uuidv4()
  const existing = load() ?? { deviceId: '', name: '', language: 'vi' }
  save({ ...existing, deviceId: id })
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
  return load()?.language ?? null
}

export function saveLanguage(lang: Language) {
  const p = load()
  if (p) save({ ...p, language: lang })
}

export function isFirstVisit(): boolean {
  const p = load()
  return !p?.name
}

export function savePlayerName(name: string) {
  const p = load()
  if (p) save({ ...p, name })
  else save({ deviceId: getOrCreateDeviceId(), name, language: detectLanguage() })
}

export function getPlayerName(): string {
  return load()?.name ?? ''
}

export function clearPlayer() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}
