'use client'

import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'pink' | 'sky'

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) || 'light'
    setThemeState(saved)
    applyTheme(saved)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return { theme, setTheme }
}
