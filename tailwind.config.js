/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lab-bg': {
          DEFAULT: '#0a0e12',
          secondary: '#10171d',
          tertiary: '#18222b',
          hover: '#212d37',
          inset: '#0c1217',
        },
        'lab-border': {
          DEFAULT: '#243240',
          light: '#3a4d59',
          strong: '#4a6072',
        },
        'lab-text': {
          primary: '#eaf2f5',
          secondary: '#9fb1b8',
          muted: '#6c7d85',
        },
        'lab-accent': {
          DEFAULT: '#46cdd9',
          hover: '#7ee0e8',
          dim: '#13414a',
        },
        'lab-beam': {
          DEFAULT: '#ffd451',
          soft: '#ffe9a3',
        },
        'lab-amber': {
          DEFAULT: '#ffb74d',
          dim: '#4a3520',
        },
        'lab-success': '#4ade80',
        'lab-warning': '#fbbf52',
        'lab-danger': '#ff6f61',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI Variable', 'Segoe UI', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      borderRadius: {
        'lab': '8px',
        'lab-lg': '12px',
      },
      boxShadow: {
        'lab-glow': '0 0 0 1px rgba(70,205,217,0.32), 0 14px 38px rgba(0,0,0,0.40)',
        'lab-beam': '0 0 22px rgba(255,212,81,0.22)',
        'lab-amber': '0 0 0 1px rgba(255,183,77,0.40), 0 6px 20px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'lab-grid': 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
    },
  },
  plugins: [],
}
