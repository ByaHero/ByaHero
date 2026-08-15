/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f3878',
          hover: '#0a2958',
          light: '#eef3fc',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#0f3878',
          950: '#0a2958',
        },
        accent: {
          DEFAULT: '#4C85C5',
          hover: '#3b70ad',
          light: '#e2eefb',
        },
        brand: {
          blue: '#0f3878',
          darkBlue: '#0a2958',
          sky: '#4C85C5',
          light: '#eef3fc',
        },
        surface: '#ffffff',
        mainBg: '#f8fafc',
        borderLine: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'sidebar': '0 10px 15px -3px rgba(15, 56, 120, 0.04), 0 4px 6px -4px rgba(15, 56, 120, 0.04)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '20px',
      },
      keyframes: {
        'beacon-ping': {
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'pulse-dot': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        'modal-enter': {
          'from': { transform: 'scale(0.95)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'beacon-ping': 'beacon-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-dot': 'pulse-dot 1.5s infinite',
        'modal-enter': 'modal-enter 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
