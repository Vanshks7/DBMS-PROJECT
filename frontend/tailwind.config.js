/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF9F5',
        sage: {
          faint: '#F4F7F3',
          light: '#EDF3EE',
          border: '#D8E2DB',
          muted: '#5D7168',
          DEFAULT: '#526B5E',
          block: '#3F6755',
          dark: '#476A5B',
        },
        lime: {
          faint: '#F7FBD9',
          light: '#E6F19A',
          DEFAULT: '#C9DB36',
          dark: '#A6B81C',
          ink: '#59650A',
        },
        motto: '#5D7168',
        body: '#55635C',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Oswald', 'sans-serif'],
        heading: ['Oswald', '"Bebas Neue"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      letterSpacing: {
        poster: '0.08em',
        widest: '0.2em',
      },
    },
  },
  plugins: [],
}
