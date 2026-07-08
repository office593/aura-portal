/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#eef1f7',
          100: '#d6dded',
          200: '#b0bcd4',
          400: '#4a6090',
          500: '#1B2A4A',
          600: '#162240',
          700: '#111d35',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
