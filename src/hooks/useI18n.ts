'use client'

import { useEffect, useState } from 'react'
import { getT, detectLanguage } from '@/lib/i18n/translations'
import { getSavedLanguage, saveLanguage } from '@/lib/player'
import type { Language } from '@/types'

export function useI18n() {
  const [language, setLanguageState] = useState<Language>('vi')

  useEffect(() => {
    const saved = getSavedLanguage()
    setLanguageState(saved ?? detectLanguage())
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    saveLanguage(lang)
    const deviceId = localStorage.getItem('deviceId')
    if (deviceId) {
      fetch(`/api/players/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {})
    }
  }

  function t(key: string): string {
    const dict = getT(language) as Record<string, string>
    return dict[key] ?? key
  }

  return { language, setLanguage, t }
}
