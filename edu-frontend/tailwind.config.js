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
        // Primary - Dark Green (UI Elements)
        primary: {
          50: '#f0f4f1',
          100: '#dae5dc',
          200: '#b5cbb9',
          300: '#8fb096',
          400: '#6a9673',
          500: '#41644A',  // Base green
          600: '#375541',
          700: '#2d4634',
          800: '#233727',
          900: '#19281a',
        },
        // Secondary - Darker Green (Emphasis)
        secondary: {
          50: '#e6f0e8',
          100: '#c2d9c5',
          200: '#9ec2a3',
          300: '#7aab81',
          400: '#56945f',
          500: '#0D4715',  // Darker green
          600: '#0b3c12',
          700: '#09320f',
          800: '#07270c',
          900: '#051d09',
        },
        // Accent - Orange
        accent: {
          50: '#fef3ed',
          100: '#fce0cb',
          200: '#f9c097',
          300: '#f7a163',
          400: '#f4812f',
          500: '#E9762B',  // Base orange
          600: '#c96324',
          700: '#a9511d',
          800: '#894016',
          900: '#692e0f',
        },
        // Neutral - Cream Scale
        neutral: {
          50: '#F9F8F5',   // Lightest cream
          100: '#EBE1D1',  // Base cream
          200: '#D8CBC0',
          300: '#C5B5A9',
          400: '#A89885',
          500: '#8B7B6B',
          600: '#6E5E51',
          700: '#524437',
          800: '#3A2E23',
          900: '#1F1612',  // Darkest (for dark mode bg)
        },
        // Semantic Colors
        success: {
          50: '#f0f4f1',
          100: '#dae5dc',
          500: '#41644A',  // Green
          600: '#375541',
          700: '#2d4634',
        },
        warning: {
          50: '#fef3ed',
          100: '#fce0cb',
          500: '#E9762B',  // Orange
          600: '#c96324',
          700: '#a9511d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#DC2626',  // Red
          600: '#b91c1c',
          700: '#991b1b',
        },
        info: {
          50: '#e6f0e8',
          500: '#0D4715',  // Darker green
          600: '#0b3c12',
          700: '#09320f',
        },
        // Dark Mode Specific Colors
        dark: {
          bg: {
            primary: '#1F1612',   // Darkest neutral
            secondary: '#2A1F18',
            tertiary: '#3A2E23',
          },
          card: '#2A1F18',
          border: 'rgba(65, 100, 74, 0.2)',  // Green tint
          text: {
            primary: '#EBE1D1',    // Cream
            secondary: '#C5B5A9',
            muted: '#8B7B6B',
          },
          green: {
            500: '#5A8566',  // Lighter green for dark mode
            600: '#6FA87D',  // Even lighter for emphasis
          },
          accent: {
            500: '#F7A855',  // Lighter orange for dark mode
          }
        }
      },
      backgroundImage: {
        // Green gradients
        'gradient-primary': 'linear-gradient(135deg, #41644A 0%, #0D4715 100%)',
        'gradient-primary-light': 'linear-gradient(135deg, #6a9673 0%, #41644A 100%)',
        'gradient-accent': 'linear-gradient(135deg, #E9762B 0%, #F7A855 100%)',

        // Dark mode gradients
        'dark-radial': 'radial-gradient(circle at 20% 20%, #1F1612, #2A1F18 60%, #1F1612 100%)',
        'dark-sidebar': 'linear-gradient(180deg, #2A1F18 0%, #3A2E23 100%)',
        'dark-gradient-primary': 'linear-gradient(135deg, #5A8566 0%, #41644A 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(65, 100, 74, 0.3)',
        'glow-orange': '0 0 20px rgba(233, 118, 43, 0.3)',
        'glow-dark-green': '0 0 20px rgba(90, 133, 102, 0.3)',
      },
    },
  },
  plugins: [],
}
