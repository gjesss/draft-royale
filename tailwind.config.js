/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand: electric "victory" green (kept under `cyan` key so existing
        //    classNames inherit the new palette without a global rename) ──
        cyan: {
          400: '#2BE36B',
          500: '#16C95C',
          600: '#0FA94B',
          700: '#0B8C3E',
          800: '#0a6e32',
          900: '#0c3d20',
        },
        // Champion / #1 accent — used sparingly
        gold: {
          400: '#F5C242',
          500: '#E0A92B',
          700: '#7a5a16',
          900: '#2a2110',
        },
        // ── Cool charcoal-steel surfaces (dark-mode native) ──
        royal: {
          dark: '#0B0E11',   // page base
          card: '#151A21',   // raised surface
          steel: '#1C2530',  // elevated surface
          border: '#232C36',
          muted: '#2C3742',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Oswald', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        jersey: '0.06em',
      },
      boxShadow: {
        neon: '0 0 0 1px #16C95C40, 0 0 24px -4px #16C95C66',
        'neon-sm': '0 0 0 1px #16C95C40, 0 0 12px -4px #16C95C55',
        'neon-gold': '0 0 0 1px #E0A92B40, 0 0 18px -4px #E0A92B66',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 30px -16px rgba(0,0,0,0.8)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-up': 'slide-up 0.32s cubic-bezier(0.16,1,0.3,1)',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 0 1px #16C95C55, 0 0 10px -2px #16C95C55' },
          '50%': { boxShadow: '0 0 0 1px #2BE36B, 0 0 26px -2px #2BE36B99' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
}
