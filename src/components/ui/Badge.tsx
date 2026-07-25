import { clsx } from 'clsx'

interface BadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  elo?: number
  size?: 'sm' | 'md'
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  bronze: {
    bg: 'rgba(180, 95, 40, 0.15)',
    text: '#cd8842',
    border: 'rgba(180, 95, 40, 0.35)',
    gradient: 'linear-gradient(135deg, #cd8842 0%, #8b4513 100%)',
  },
  silver: {
    bg: 'rgba(192, 200, 215, 0.15)',
    text: '#d1d8e3',
    border: 'rgba(192, 200, 215, 0.35)',
    gradient: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)',
  },
  gold: {
    bg: 'rgba(212, 168, 73, 0.15)',
    text: '#d4a849',
    border: 'rgba(212, 168, 73, 0.4)',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d4a849 100%)',
  },
  platinum: {
    bg: 'rgba(34, 211, 238, 0.15)',
    text: '#22d3ee',
    border: 'rgba(34, 211, 238, 0.35)',
    gradient: 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
  },
  diamond: {
    bg: 'rgba(168, 85, 247, 0.15)',
    text: '#a855f7',
    border: 'rgba(168, 85, 247, 0.35)',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
  },
}

const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '👑',
}

export default function Badge({ tier, elo, size = 'sm' }: BadgeProps) {
  const c = TIER_COLORS[tier]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md font-semibold leading-none border backdrop-blur-sm',
        { 'text-[10px] px-1.5 py-1': size === 'sm', 'text-xs px-2 py-1.5': size === 'md' }
      )}
      style={{
        background: c.bg,
        color: c.text,
        borderColor: c.border,
      }}
    >
      <span style={{ filter: 'saturate(1.2)' }}>{TIER_ICONS[tier]}</span>
      {elo !== undefined ? elo : tier}
    </span>
  )
}
