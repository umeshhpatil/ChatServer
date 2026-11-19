/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          bg: '#313338',
          side: '#2b2d31',
          rail: '#1e1f22',
          input: '#383a40',
          border: '#232428',
          text: '#dbdee1',
          muted: '#949ba4',
          accent: '#5865f2',
          'accent-hover': '#4752c4',
          online: '#23a559',
          warn: '#f0b232',
          danger: '#da373c',
        }
      }
    },
  },
  plugins: [],
}

