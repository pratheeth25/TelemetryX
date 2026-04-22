/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#030712',
          850: '#111827',
          750: '#1f2937',
        },
      },
    },
  },
  plugins: [],
}
