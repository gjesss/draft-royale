/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyan: {
          400: '#00d4ff',
          500: '#00b8d9',
          600: '#0099b3',
        },
        royal: {
          dark: '#0a0a0a',
          card: '#111827',
          border: '#1f2937',
          muted: '#374151',
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
      boxShadow: {
        neon: '0 0 10px #00d4ff, 0 0 30px #00d4ff40',
        'neon-sm': '0 0 5px #00d4ff, 0 0 15px #00d4ff40',
        'neon-gold': '0 0 10px #fbbf24, 0 0 30px #fbbf2440',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.4s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 5px #00d4ff, 0 0 15px #00d4ff40' },
          '50%': { boxShadow: '0 0 20px #00d4ff, 0 0 60px #00d4ff80' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
