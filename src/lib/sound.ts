'use client'

let ctx: AudioContext | null = null
let enabled = true
let volume = 0.5

export function initSound() {
  if (typeof window === 'undefined') return
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      ctx = new AC()
    } catch {}
  }
}

export function setSoundEnabled(e: boolean) {
  enabled = e
}

export function setSoundVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.2) {
  if (!ctx || !enabled || ctx.state === 'closed') return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    const t0 = ctx.currentTime
    gain.gain.setValueAtTime(vol * volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(t0 + duration)
  } catch {}
}

export function playMove() { playTone(280, 0.06, 'sine', 0.18) }
export function playCapture() { playTone(180, 0.1, 'triangle', 0.28) }
export function playCheck() {
  playTone(440, 0.15, 'sawtooth', 0.22)
  setTimeout(() => playTone(330, 0.15, 'sawtooth', 0.22), 100)
}
export function playWin() {
  const notes = [262, 330, 392, 523]
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.2, 'sine', 0.28), i * 120))
}
export function playLose() {
  playTone(330, 0.3, 'sine', 0.2)
  setTimeout(() => playTone(220, 0.4, 'sine', 0.18), 200)
  setTimeout(() => playTone(165, 0.5, 'sine', 0.16), 500)
}
export function playDraw() {
  playTone(440, 0.2, 'sine', 0.2)
  setTimeout(() => playTone(440, 0.2, 'sine', 0.2), 200)
}
export function playClick() { playTone(600, 0.04, 'sine', 0.1) }
