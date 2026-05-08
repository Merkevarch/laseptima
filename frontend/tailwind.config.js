/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mesaLibre: '#4CAF50',
        mesaOcupada: '#FFC107',
        primary: '#2196F3',
        danger: '#DC2626'
      }
    }
  },
  plugins: []
}