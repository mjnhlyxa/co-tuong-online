'use client'
import { SVGProps } from 'react'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export type IconName =
  | 'scroll' | 'chat' | 'eye' | 'more' | 'send' | 'copy' | 'share'
  | 'back' | 'close' | 'check' | 'arrow-right' | 'arrow-left'
  | 'trophy' | 'crown' | 'flag' | 'undo' | 'cog' | 'refresh' | 'plus'
  | 'pause' | 'play' | 'lightning' | 'fire' | 'star'
  | 'link' | 'logout' | 'info' | 'menu' | 'volume' | 'mute' | 'bell'
  | 'controller' | 'puzzle' | 'history' | 'user' | 'users'
  | 'sparkle' | 'medal' | 'flame'

const PATHS: Record<IconName, string> = {
  scroll: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 4h10M7 11h10M7 15h6',
  chat: 'M21 12a8 8 0 11-3-6.2L21 4l-1 4.2A8 8 0 0121 12z',
  eye: 'M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  copy: 'M9 9h10v10H9V9zM5 15V5a2 2 0 012-2h10',
  share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  back: 'M19 12H5M12 19l-7-7 7-7',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M5 13l4 4L19 7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 11-10 0V4zM17 4h3a3 3 0 010 6h-3M7 4H4a3 3 0 000 6h3',
  crown: 'M2 20h20L18 8l-4 4-2-6-2 6-4-4-4 12z',
  flag: 'M4 22V4l8 4-8 4',
  undo: 'M3 7v6h6M3 13a9 9 0 1018 0 9 9 0 00-18 0z',
  cog: 'M12 8a4 4 0 100 8 4 4 0 000-8z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  plus: 'M12 5v14M5 12h14',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  play: 'M5 3l14 9-14 9V3z',
  lightning: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  fire: 'M12 2c2 4 4 6 4 10a4 4 0 11-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-9z',
  star: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  info: 'M12 8v4M12 16h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  volume: 'M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14',
  mute: 'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6',
  bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0',
  controller: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M6.5 6h11a4 4 0 014 4v4a4 4 0 01-4 4h-11a4 4 0 01-4-4v-4a4 4 0 014-4z',
  puzzle: 'M19 11h-1V8a2 2 0 00-2-2h-3V5a2 2 0 10-4 0v1H5a2 2 0 00-2 2v4a2 2 0 002 2h2v3a2 2 0 002 2h3a2 2 0 002-2v-1h2a2 2 0 002-2v-3a2 2 0 00-2-2h-1v-2z',
  history: 'M3 12a9 9 0 1018 0 9 9 0 00-18 0zM3 12l4-4M3 12l4 4M12 7v5l3 3',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  sparkle: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z',
  medal: 'M12 15a4 4 0 100-8 4 4 0 000 8zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  flame: 'M12 2c2 4 4 6 4 10a4 4 0 11-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-9z',
}

export default function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
