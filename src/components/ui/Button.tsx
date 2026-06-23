'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'red' | 'black'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none',
          {
            // sizes
            'text-xs px-3 h-7': size === 'sm',
            'text-sm px-4 h-9': size === 'md',
            'text-base px-6 h-11': size === 'lg',
            // variants
            'bg-[var(--c-accent)] text-white hover:bg-[var(--c-accent-h)] active:bg-[var(--c-accent-active)]': variant === 'primary',
            'bg-[var(--c-elevated)] text-[var(--c-text)] hover:bg-[var(--c-border)] border border-[var(--c-border)]': variant === 'secondary',
            'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-elevated)]': variant === 'ghost',
            'bg-[var(--c-danger)] text-white hover:bg-[var(--c-danger-h)]': variant === 'danger',
            'bg-[var(--c-danger)] text-white hover:bg-[var(--c-danger-hh)]': variant === 'red',
            'bg-[var(--c-piece-black)] text-[var(--c-bg)] hover:bg-[var(--c-piece-black-l)]': variant === 'black',
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
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
