'use client'
import { clsx } from 'clsx'

interface AvatarProps {
  name: string
  color?: 'red' | 'black' | 'gold' | 'auto'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  ring?: boolean
}

const GRADIENTS = [
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-sky-400 to-sky-600',
  'from-orange-400 to-orange-600',
  'from-fuchsia-400 to-fuchsia-600',
  'from-teal-400 to-teal-600',
]

function hashGradient(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!
}

const SIZE: Record<string, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl',
}

export default function Avatar({ name, color = 'auto', size = 'md', className, ring = true }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const gradient =
    color === 'red' ? 'from-rose-500 to-rose-700' :
    color === 'black' ? 'from-slate-500 to-slate-700' :
    color === 'gold' ? 'from-amber-400 to-amber-600' :
    hashGradient(name)
  return (
    <div className={clsx(
      'inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shrink-0',
      gradient,
      SIZE[size],
      ring && 'ring-2 ring-[var(--c-surface)]',
      className
    )}>
      {initial}
    </div>
  )
}
