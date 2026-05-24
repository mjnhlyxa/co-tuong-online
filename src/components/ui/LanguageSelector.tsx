'use client'

import type { Language } from '@/types'

const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'pt', flag: '🇧🇷', name: 'Português' },
]

interface LanguageSelectorProps {
  value: Language
  onChange: (lang: Language) => void
  compact?: boolean
}

export default function LanguageSelector({ value, onChange, compact }: LanguageSelectorProps) {
  const current = LANGUAGES.find(l => l.code === value) ?? LANGUAGES[0]

  if (compact) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value as Language)}
          aria-label="Select language"
          className="appearance-none bg-transparent text-[var(--c-muted)] hover:text-[var(--c-text)] text-sm cursor-pointer pr-4 focus:outline-none"
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code} className="bg-[var(--c-surface)] text-[var(--c-text)]">
              {l.flag} {l.code.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as Language)}
        aria-label="Select language"
        className="w-full appearance-none bg-[var(--c-elevated)] border border-[var(--c-border)] text-[var(--c-text)] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[var(--c-accent)] cursor-pointer"
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code} className="bg-[var(--c-surface)]">
            {l.flag} {l.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-muted)]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export { LANGUAGES }
