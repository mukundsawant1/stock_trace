/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f9f5',
          100: '#e9f2eb',
          500: '#3c7d5c',
          700: '#2c5d42'
        }
      }
    }
  },
  plugins: []
};