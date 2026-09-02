/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#000000',
          card: '#0a0a0a',
          red: '#ff0000',
          'red-bright': '#ef4444',
          'red-dark': '#991b1b',
        }
      }
    },
  },
  plugins: [],
}



