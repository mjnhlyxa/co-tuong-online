'use client'

import { useEffect, useState } from 'react'

interface TimerProps {
  timeRemainingMs: number | null
  isActive: boolean
  lastMoveAt: string | null
}

export default function Timer({ timeRemainingMs, isActive, lastMoveAt }: TimerProps) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (timeRemainingMs === null) {
      setDisplay('∞')
      return
    }

    function compute() {
      if (timeRemainingMs === null) return
      let ms = timeRemainingMs
      if (isActive && lastMoveAt) {
        const elapsed = Date.now() - new Date(lastMoveAt).getTime()
        ms = Math.max(0, timeRemainingMs - elapsed)
      }
      const totalSecs = Math.ceil(ms / 1000)
      const mins = Math.floor(totalSecs / 60)
      const secs = totalSecs % 60
      setDisplay(`${mins}:${String(secs).padStart(2, '0')}`)
    }

    compute()
    const interval = setInterval(compute, 500)
    return () => clearInterval(interval)
  }, [timeRemainingMs, isActive, lastMoveAt])

  if (timeRemainingMs === null) {
    return <span className="text-[var(--c-muted)] text-sm font-mono">∞</span>
  }

  let ms = timeRemainingMs
  if (isActive && lastMoveAt) {
    ms = Math.max(0, timeRemainingMs - (Date.now() - new Date(lastMoveAt).getTime()))
  }
  const isLow = ms < 60000
  const isCritical = ms < 20000

  return (
    <span
      className={`text-base font-mono font-bold tabular-nums ${
        isCritical ? 'text-[var(--c-danger)] animate-pulse' : isLow ? 'text-[var(--c-warning)]' : 'text-[var(--c-text)]'
      }`}
    >
      {display}
    </span>
  )
}
