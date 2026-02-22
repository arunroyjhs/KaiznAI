import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui-components/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#0A0A0B',
        surface: {
          DEFAULT: '#111113',
          elevated: '#18181B',
        },
        border: {
          DEFAULT: '#27272A',
          strong: '#3F3F46',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          muted: '#52525B',
        },
        signal: {
          positive: '#10B981',
          negative: '#EF4444',
          neutral: '#6366F1',
          warning: '#F59E0B',
        },
        accent: {
          primary: '#6366F1',
          secondary: '#8B5CF6',
          glow: 'rgba(99, 102, 241, 0.15)',
        },
        chart: {
          control: '#52525B',
          treatment: '#6366F1',
          target: '#10B981',
          baseline: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: '11px',
        sm: '13px',
        base: '15px',
        lg: '17px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        display: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
