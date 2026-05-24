import { clsx } from 'clsx'

interface BadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  elo?: number
  size?: 'sm' | 'md'
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-900/40 text-amber-400 border-amber-700/50',
  silver: 'bg-slate-700/40 text-slate-300 border-slate-500/50',
  gold: 'bg-yellow-900/40 text-yellow-400 border-yellow-600/50',
  platinum: 'bg-cyan-900/40 text-cyan-300 border-cyan-600/50',
  diamond: 'bg-violet-900/40 text-violet-300 border-violet-500/50',
}

const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '👑',
}

export default function Badge({ tier, elo, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border font-medium leading-none',
        TIER_COLORS[tier],
        { 'text-[10px] px-1.5 py-0.5': size === 'sm', 'text-xs px-2 py-1': size === 'md' }
      )}
    >
      <span>{TIER_ICONS[tier]}</span>
      {elo !== undefined ? `${elo}` : tier}
    </span>
  )
}
