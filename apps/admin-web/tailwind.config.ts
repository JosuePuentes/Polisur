import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        polisur: {
          navy: '#0a1628',
          cyan: '#22d3ee',
          accent: '#1e3a5f',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        tactical: '0 0 40px rgba(34, 211, 238, 0.08)',
        'tactical-lg': '0 0 60px rgba(34, 211, 238, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
