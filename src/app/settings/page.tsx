'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/hooks/useSettings'
import { usePlayer } from '@/hooks/usePlayer'
import Button from '@/components/ui/Button'
import Icon, { type IconName } from '@/components/ui/Icon'
import { LANGUAGES } from '@/components/ui/LanguageSelector'
import { useI18n } from '@/hooks/useI18n'
import { clsx } from 'clsx'

const THEMES: Array<{ id: 'dark' | 'light' | 'pink' | 'sky'; label: string; gradient: string }> = [
  { id: 'dark', label: 'Tối', gradient: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%)' },
  { id: 'light', label: 'Sáng', gradient: 'linear-gradient(135deg, #faf6ee 0%, #e8d8b4 100%)' },
  { id: 'pink', label: 'Hồng', gradient: 'linear-gradient(135deg, #1a0f16 0%, #4a1f3a 100%)' },
  { id: 'sky', label: 'Xanh', gradient: 'linear-gradient(135deg, #f0f8ff 0%, #c0d8f0 100%)' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { settings, update, reset } = useSettings()
  const { setLanguage, t } = useI18n()
  const { deviceId, regenerateCode } = usePlayer()
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)

  useEffect(() => {
    if (!deviceId) return
    fetch(`/api/players/${deviceId}`)
      .then(r => r.json())
      .then(d => { if (d?.recoveryCode) setRecoveryCode(d.recoveryCode) })
      .catch(() => {})
  }, [deviceId])

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-panel-strong border-b border-[var(--c-border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
          >
            <Icon name="back" size={14} />
            Về lobby
          </button>
          <h1 className="font-bold text-[var(--c-text)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Cài đặt
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Display Section */}
        <Section icon="cog" title="Hiển thị">
          <Row label="Giao diện" desc="Chọn theme cho ứng dụng">
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => update('theme', t.id)}
                  className={clsx(
                    'relative h-14 rounded-xl overflow-hidden border-2 transition-all',
                    settings.theme === t.id
                      ? 'border-[var(--c-accent)] scale-105 shadow-[0_0_0_3px_var(--c-accent-bg)]'
                      : 'border-[var(--c-border)] hover:border-[var(--c-accent)]/50'
                  )}
                  title={t.label}
                >
                  <div className="absolute inset-0" style={{ background: t.gradient }} />
                  {settings.theme === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon name="check" size={18} className="text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Ngôn ngữ" desc="Ngôn ngữ hiển thị">
            <select
              value={settings.language}
              onChange={(e) => {
                update('language', e.target.value)
                setLanguage(e.target.value as Parameters<typeof setLanguage>[0])
              }}
              className="bg-[var(--c-elevated)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)] cursor-pointer min-w-[180px]"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className="bg-[var(--c-surface)]">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Bàn cờ mặc định" desc="2D sắc nét hoặc 3D với hiệu ứng 3D">
            <div className="flex gap-2">
              <ToggleButton
                active={settings.boardStyle === '2d'}
                onClick={() => update('boardStyle', '2d')}
                icon="scroll"
              >
                2D
              </ToggleButton>
              <ToggleButton
                active={settings.boardStyle === '3d'}
                onClick={() => update('boardStyle', '3d')}
                icon="play"
              >
                3D
              </ToggleButton>
            </div>
          </Row>

          <Row label="Hiển thị tọa độ" desc="Hiện chỉ số hàng/cột trên bàn cờ">
            <Switch
              checked={settings.showCoordinates}
              onChange={(v) => update('showCoordinates', v)}
            />
          </Row>
        </Section>

        {/* Sound Section */}
        <Section icon="volume" title="Âm thanh">
          <Row label="Bật âm thanh" desc="Phát nhạc khi đi quân, ăn quân, chiếu tướng">
            <Switch
              checked={settings.sound}
              onChange={(v) => update('sound', v)}
            />
          </Row>

          <Row label="Âm lượng" desc={settings.sound ? 'Điều chỉnh âm lượng' : 'Bật âm thanh để chỉnh âm lượng'}>
            <div className="flex items-center gap-3 flex-1 max-w-[200px]">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!settings.sound}
                value={settings.soundVolume}
                onChange={(e) => update('soundVolume', parseFloat(e.target.value))}
                className="flex-1 accent-[var(--c-accent)] disabled:opacity-30"
              />
              <span className="text-xs text-[var(--c-muted)] tabular-nums w-8">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
          </Row>
        </Section>

        {/* Account Section */}
        <Section icon="user" title="Tài khoản">
          {recoveryCode && (
            <Row
              label="Mã khôi phục tài khoản"
              desc="Dùng mã này để khôi phục tài khoản khi đổi thiết bị hoặc xóa browser"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono font-bold text-[var(--c-accent)] bg-[var(--c-elevated)] px-3 py-1.5 rounded-lg select-all">
                  {recoveryCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(recoveryCode)
                    const { toast } = await import('@/components/ui/Toast')
                    toast('Đã sao chép mã khôi phục!', 'success')
                  }}
                >
                  Sao chép
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const newCode = await regenerateCode()
                      setRecoveryCode(newCode)
                      const { toast } = await import('@/components/ui/Toast')
                      toast(`Mã mới: ${newCode}`, 'success')
                    } catch {
                      const { toast } = await import('@/components/ui/Toast')
                      toast('Không thể tạo mã mới', 'error')
                    }
                  }}
                >
                  Tạo mã mới
                </Button>
              </div>
            </Row>
          )}
          <Row label="Đặt lại về mặc định" desc="Khôi phục tất cả cài đặt">
            <Button variant="secondary" size="sm" onClick={reset}>
              Đặt lại
            </Button>
          </Row>
        </Section>

        <p className="text-center text-xs text-[var(--c-muted)] pt-4">
          Cài đặt được lưu cục bộ trong trình duyệt
        </p>
      </main>
    </div>
  )
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-5 sm:p-6">
      <h2 className="text-sm font-bold text-[var(--c-muted)] uppercase tracking-wider flex items-center gap-2 mb-4">
        <Icon name={icon} size={14} className="text-[var(--c-accent)]" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-[var(--c-border)]/50 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--c-text)]">{label}</div>
        {desc && <div className="text-xs text-[var(--c-muted)] mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        checked ? 'bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-active)]' : 'bg-[var(--c-elevated-2)]'
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </button>
  )
}

function ToggleButton({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: IconName; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5',
        active
          ? 'bg-[var(--c-accent-bg)] border-[var(--c-accent)] text-[var(--c-accent)] shadow-[0_0_0_3px_var(--c-accent-bg)]'
          : 'bg-[var(--c-elevated)] border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)]'
      )}
    >
      <Icon name={icon} size={12} />
      {children}
    </button>
  )
}
