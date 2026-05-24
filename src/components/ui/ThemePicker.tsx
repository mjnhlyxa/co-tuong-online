'use client'

import { useTheme, type Theme } from '@/hooks/useTheme'

const THEMES: { id: Theme; accent: string; label: string }[] = [
  { id: 'dark',  accent: '#4f9cf7', label: 'Dark' },
  { id: 'light', accent: '#2563eb', label: 'Light' },
  { id: 'pink',  accent: '#f472b6', label: 'Pink' },
  { id: 'sky',   accent: '#0284c7', label: 'Sky' },
]

export default function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Theme">
      {THEMES.map(({ id, accent, label }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          title={label}
          aria-pressed={theme === id}
          className="w-5 h-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
          style={{
            background: accent,
            boxShadow: theme === id
              ? `0 0 0 2px var(--c-surface), 0 0 0 3.5px ${accent}`
              : 'none',
          }}
        />
      ))}
    </div>
  )
}
