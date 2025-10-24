/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff'
        },
        surface: {
          light: '#f8fafc',
          dark: '#0f172a'
        }
      }
    }
  },
  darkMode: 'class',
  plugins: []
};
