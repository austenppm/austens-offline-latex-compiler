/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'overleaf': {
          'dark': '#1b222c',
          'sidebar': '#252b36',
          'editor': '#1b222c',
          'border': '#495365',
          'accent': '#098842',
          'accent-hover': '#076d35',
        }
      }
    },
  },
  plugins: [],
}
