'use client'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group">
      <div className="flex flex-col items-center pt-0.5">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-out ${
            checked
              ? 'bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)] shadow-[0_0_12px_rgba(212,168,73,0.4)]'
              : 'bg-[var(--c-border)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ease-out shadow-[var(--shadow-sm)] ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <div className="text-sm font-medium text-[var(--c-text)]">{label}</div>}
          {description && <div className="text-xs text-[var(--c-muted)] mt-0.5">{description}</div>}
        </div>
      )}
    </label>
  )
}
