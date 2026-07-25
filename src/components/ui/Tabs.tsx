'use client'
import { ReactNode, useState } from 'react'
import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
  children: (activeId: string) => ReactNode
}

export default function Tabs({ tabs, defaultTab, onChange, variant = 'underline', className, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)

  function handleClick(id: string) {
    setActive(id)
    onChange?.(id)
  }

  return (
    <div className={className}>
      <div role="tablist" className={clsx(
        'flex gap-1',
        variant === 'underline' ? 'border-b border-[var(--c-border)]' : 'p-1 bg-[var(--c-elevated)] rounded-lg'
      )}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => handleClick(tab.id)}
            className={clsx(
              'inline-flex items-center gap-1.5 text-sm font-medium transition-all cursor-pointer',
              variant === 'underline'
                ? 'px-4 py-2.5 border-b-2 -mb-px ' + (active === tab.id
                    ? 'border-[var(--c-accent)] text-[var(--c-accent)]'
                    : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]')
                : 'px-3 py-1.5 rounded-md ' + (active === tab.id
                    ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)]')
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--c-accent-bg)] text-[var(--c-accent)] font-semibold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3">{children(active)}</div>
    </div>
  )
}
