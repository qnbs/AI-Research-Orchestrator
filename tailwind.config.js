/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './index.tsx', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Figtree', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
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
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        'glow-lg': 'var(--shadow-lg)',
        'glow-sm': 'var(--shadow-sm)',
        glass: 'var(--shadow-md)',
        soft: 'var(--shadow-md)',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      animation: {
        fadeIn: 'fadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInUp: 'slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInDown: 'slideInDown 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInLeft: 'slideInLeft 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pulseGlow: 'pulseGlow 3.5s ease-in-out infinite',
        auroraMove: 'auroraMove 80s linear infinite alternate',
        scanline: 'scanline 8s linear infinite',
        matrixRain: 'matrixRain 20s linear infinite',
        neonFlicker: 'neonFlicker 3s infinite',
        borderFlow: 'borderFlow 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: 'var(--shadow-glow)', opacity: '0.9' },
          '50%': { boxShadow: 'var(--shadow-md)', opacity: '1' },
        },
        auroraMove: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '100%': { transform: 'rotate(4deg) scale(1.06)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        neonFlicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.65' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      transitionTimingFunction: {
        cyber: 'cubic-bezier(0.4, 0, 0.2, 1)',
        glide: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
