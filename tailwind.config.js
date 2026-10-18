/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          text: '#e2e8f0',
          muted: '#64748b',
          accent: '#7c3aed',
          'accent-hover': '#6d28d9',
        },
      },
    },
  },
  plugins: [],
}
