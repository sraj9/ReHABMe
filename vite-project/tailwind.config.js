/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3d9cd6',
          50: '#f0f8ff',
          100: '#dff0fc',
          200: '#bce1f9',
          300: '#89ccf5',
          400: '#50b2ec',
          500: '#3d9cd6',
          600: '#2d8bc5',
          700: '#1e7ab4',
          800: '#1a6494',
          900: '#1a537a',
        },
        accent: {
          DEFAULT: '#b7f383',
          500: '#b7f383',
          600: '#9ee060',
          700: '#7fca3a',
        },
        surface: '#f4f7ed',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
