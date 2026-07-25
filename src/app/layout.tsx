import type { Metadata } from 'next'
import { Inter, Outfit, JetBrains_Mono, Noto_Serif_SC } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })
const notoSerifSC = Noto_Serif_SC({ subsets: ['latin'], weight: ['700'], variable: '--font-noto' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Cờ Tướng Online — Chơi Miễn Phí, Không Cần Đăng Ký',
    template: '%s | Cờ Tướng Online',
  },
  description:
    'Chơi cờ tướng online miễn phí với bạn bè. Tạo phòng, chia sẻ link là vào ngay — không cần đăng ký. Hỗ trợ 8 ngôn ngữ. Play Xiangqi / Chinese Chess online free, no account needed.',
  keywords: [
    'cờ tướng online', 'chơi cờ tướng', 'cờ tướng miễn phí', 'cờ tướng multiplayer',
    'co tuong online', 'xiangqi online', 'chinese chess online', 'play xiangqi free',
    '象棋在线', '免费象棋', '在线象棋', 'شطرنج صيني', 'échecs chinois en ligne',
    'chinesisches schach online', 'xadrez chinês online',
  ],
  authors: [{ name: 'Cờ Tướng Online' }],
  creator: 'Cờ Tướng Online',
  publisher: 'Cờ Tướng Online',
  category: 'games',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    alternateLocale: ['en_US', 'zh_CN', 'ko_KR', 'ru_RU', 'fr_FR', 'de_DE', 'pt_BR'],
    url: '/',
    siteName: 'Cờ Tướng Online',
    title: 'Cờ Tướng Online — Chơi Cờ Tướng Miễn Phí',
    description: 'Chơi cờ tướng online với bạn bè. Tạo phòng và chia sẻ link là vào ngay — không cần đăng ký. Hỗ trợ 8 ngôn ngữ.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Cờ Tướng Online — 象棋' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cờ Tướng Online — Chơi Cờ Tướng Miễn Phí',
    description: 'Chơi cờ tướng online với bạn bè. Không cần đăng ký — tạo phòng và chia sẻ link là vào ngay.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
  },
  manifest: '/manifest.json',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Cờ Tướng Online',
  alternateName: ['Xiangqi Online', 'Chinese Chess Online', '象棋在线'],
  url: siteUrl,
  description: 'Chơi cờ tướng online miễn phí với bạn bè. Tạo phòng, chia sẻ link là vào ngay — không cần đăng ký.',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web Browser',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  inLanguage: ['vi', 'en', 'zh', 'ko', 'ru', 'fr', 'de', 'pt'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  genre: ['Board Game', 'Strategy Game', 'Multiplayer Game'],
  about: {
    '@type': 'Game',
    name: 'Cờ Tướng (Xiangqi)',
    description: 'Traditional Chinese Chess — a classic two-player strategy board game.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} ${notoSerifSC.variable} h-full`}>
      <head>
        {/* Apply saved theme before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full antialiased min-h-screen">{children}</body>
    </html>
  )
}
