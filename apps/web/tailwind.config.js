/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'river-teal': {
          DEFAULT: '#135D66',
          hover: '#0E464D',
          light: '#E6F1F2',
        },
        'canopy-green': {
          DEFAULT: '#41745B',
          hover: '#335D48',
          light: '#EDF5F1',
        },
        'slate-ink': {
          DEFAULT: '#24343D',
          light: '#4C606B',
          muted: '#7B8F9A',
          border: '#D8E2E6',
        },
        'mist': {
          DEFAULT: '#F3F7F8',
          card: '#FFFFFF',
        },
        'evidence-amber': {
          DEFAULT: '#8A5700',
          light: '#FFF8EB',
          border: '#F2D399',
        },
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        sans: ['Source Sans 3', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(36, 52, 61, 0.05)',
      },
    },
  },
  plugins: [],
}
