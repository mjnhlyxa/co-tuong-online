'use client'

import { useState } from 'react'

interface CopyButtonProps {
  text: string
  label?: string
}

export default function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs bg-[var(--c-elevated)] hover:bg-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)] px-3 py-1.5 rounded border border-[var(--c-border)] transition-colors"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10.293 2.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L4.5 6.586l4.293-4.293a1 1 0 011.5 0z" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 2a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V2zM2 4a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1H2V4z" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}
