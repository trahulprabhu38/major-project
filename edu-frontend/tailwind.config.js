/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          bg: {
            primary: '#0D1B2A',
            secondary: '#0A1120',
            tertiary: '#101B33',
          },
          card: '#0B1625',
          border: 'rgba(255, 255, 255, 0.1)',
          text: {
            primary: '#E2E8F0',
            secondary: '#94A3B8',
            muted: '#64748B',
          }
        }
      },
      backgroundImage: {
        'dark-radial': 'radial-gradient(circle at 20% 20%, #0D1B2A, #0A1120 60%, #0D1B2A 100%)',
        'dark-sidebar': 'linear-gradient(180deg, #0B1625 0%, #101B33 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
    },
  },
  plugins: [],
}
