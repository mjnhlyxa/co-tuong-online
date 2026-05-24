import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cờ Tướng Online',
    short_name: 'Cờ Tướng',
    description: 'Chơi cờ tướng online miễn phí — không cần đăng ký',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1117',
    theme_color: '#4f9cf7',
    orientation: 'any',
    icons: [
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    ],
    categories: ['games'],
    lang: 'vi',
    dir: 'ltr',
  }
}
