/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-page': '#12121a',
        'bg-surface': '#1a1d27',
        'bg-elevated': '#232638',
        'board-light': '#d4b896',
        'board-dark': '#c4a876',
        'board-river': '#3d7a9e',
        'board-palace': '#b89860',
        'primary': '#2563eb',
        'primary-hover': '#1d4ed8',
        'primary-light': '#3b82f6',
        'accent': '#f97316',
        'accent-hover': '#ea580c',
        'success': '#22c55e',
        'warning': '#eab308',
        'danger': '#ef4444',
        'piece-red': '#dc2626',
        'piece-red-bg': '#dc2626',
        'piece-red-char': '#ffffff',
        'piece-black': '#1f2937',
        'piece-black-bg': '#1f2937',
        'piece-black-char': '#fbbf24',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.5)',
        'modal': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'piece': '0 3px 6px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
