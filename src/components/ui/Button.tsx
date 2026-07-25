'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'red' | 'black' | 'glass' | 'gold'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, fullWidth, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-200 ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-bg)]',
          'active:scale-[0.98]',
          {
            // sizes
            'text-xs px-3 h-8': size === 'sm',
            'text-sm px-4 h-10': size === 'md',
            'text-base px-6 h-12': size === 'lg',
            'text-lg px-8 h-14': size === 'xl',
            // full width
            'w-full': fullWidth,
            // variants
            'bg-[var(--c-accent)] text-[var(--c-accent-text)] hover:bg-[var(--c-accent-h)] hover:shadow-[var(--shadow-gold)] active:bg-[var(--c-accent-active)] active:shadow-none':
              variant === 'primary',
            'bg-[var(--c-elevated)] text-[var(--c-text)] hover:bg-[var(--c-elevated-2)] border border-[var(--c-border)] hover:border-[var(--c-border-bright)]':
              variant === 'secondary',
            'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)] active:bg-[var(--c-surface-2)]':
              variant === 'ghost',
            'bg-[var(--c-danger)] text-white hover:bg-[var(--c-danger-h)] hover:shadow-[0_8px_24px_rgba(232,93,74,0.25)]':
              variant === 'danger',
            'bg-[var(--c-piece-black)] text-[var(--c-bg)] hover:bg-[var(--c-piece-black-h)]':
              variant === 'black',
            'bg-[var(--glass-bg-strong)] backdrop-blur-md text-[var(--c-text)] border border-[var(--c-border-bright)] hover:bg-[var(--c-elevated)] hover:border-[var(--c-accent)]':
              variant === 'glass',
            'bg-gradient-to-br from-[var(--c-piece-red)] to-[var(--c-piece-red-h)] text-white hover:shadow-[0_8px_24px_rgba(220,38,38,0.4)]':
              variant === 'gold',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
