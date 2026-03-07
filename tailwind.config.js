/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        'input-bg': 'var(--color-input-bg)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'brand-accent': 'var(--color-brand-accent)',
        'brand-primary': 'var(--color-brand-primary)',
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-text-on-accent': 'var(--color-brand-text-on-accent)',
        'accent-cyan': 'var(--color-accent-cyan)',
        'accent-magenta': 'var(--color-accent-magenta)',
        'accent-amber': 'var(--color-accent-amber)',
        'accent-green': 'var(--color-accent-green)',
        // Neon palette
        'neon-cyan': '#00f5ff',
        'neon-purple': '#bf00ff',
        'neon-green': '#00ff41',
        'neon-pink': '#ff00aa',
        'neon-amber': '#ffaa00',
      },
      boxShadow: {
        'glow': '0 0 15px var(--color-glow)',
        'glow-lg': '0 0 30px var(--color-glow)',
        'glow-sm': '0 0 8px var(--color-glow)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.5)',
        'neon-purple': '0 0 20px rgba(191, 0, 255, 0.5)',
        'neon-green': '0 0 20px rgba(0, 255, 65, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      animation: {
        fadeIn: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInUp: 'slideInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInDown: 'slideInDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInLeft: 'slideInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pulseGlow: 'pulseGlow 3s infinite',
        auroraMove: 'auroraMove 60s linear infinite alternate',
        scanline: 'scanline 8s linear infinite',
        matrixRain: 'matrixRain 20s linear infinite',
        neonFlicker: 'neonFlicker 3s infinite',
        borderFlow: 'borderFlow 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--color-glow)', opacity: '0.8' },
          '50%': { boxShadow: '0 0 20px 5px var(--color-glow)', opacity: '1' },
        },
        auroraMove: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '100%': { transform: 'rotate(5deg) scale(1.1)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        neonFlicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.6' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      transitionTimingFunction: {
        'cyber': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'glide': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
