'use client'
import { useState } from 'react'
import { toast } from './Toast'
import Icon from './Icon'

interface CopyButtonProps {
  text: string
  label?: string
}

export default function CopyButton({ text, label = 'Sao chép' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast('Đã sao chép link!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Không thể sao chép', 'error')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs bg-[var(--c-elevated)] hover:bg-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)] px-3 py-1.5 rounded border border-[var(--c-border)] transition-colors"
    >
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? 'Đã sao chép' : label}
    </button>
  )
}
