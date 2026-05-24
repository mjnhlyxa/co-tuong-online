import { ImageResponse } from 'next/og'

export const alt = 'Cờ Tướng Online — 象棋'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f1117 0%, #161b2e 60%, #1a2033 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Board grid decoration */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(0deg, #4f9cf7 0px, #4f9cf7 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #4f9cf7 0px, #4f9cf7 1px, transparent 1px, transparent 60px)',
          display: 'flex',
        }} />

        {/* Chinese characters decorative */}
        <div style={{ fontSize: 100, color: '#4f9cf7', lineHeight: 1, letterSpacing: 8, display: 'flex' }}>
          象棋
        </div>

        {/* Main title */}
        <div style={{
          fontSize: 56,
          color: '#ffffff',
          fontWeight: 700,
          marginTop: 16,
          letterSpacing: 1,
          display: 'flex',
        }}>
          Cờ Tướng Online
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 28,
          color: '#8b9ab1',
          marginTop: 16,
          display: 'flex',
          gap: 24,
        }}>
          <span>🆓 Miễn phí</span>
          <span>·</span>
          <span>🔗 Không cần đăng ký</span>
          <span>·</span>
          <span>🌐 8 ngôn ngữ</span>
        </div>

        {/* Language row */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          gap: 12,
          fontSize: 18,
          color: '#4f6a8c',
        }}>
          <span>Tiếng Việt</span><span>·</span>
          <span>English</span><span>·</span>
          <span>中文</span><span>·</span>
          <span>한국어</span><span>·</span>
          <span>Русский</span><span>·</span>
          <span>Français</span><span>·</span>
          <span>Deutsch</span><span>·</span>
          <span>Português</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
