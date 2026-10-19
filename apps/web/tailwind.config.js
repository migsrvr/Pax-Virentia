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
        // Public portal — Figma "Pax Virentia — UI Design" tokens (pv-*)
        'pv-page': '#F5F7F4',
        'pv-brand': '#153F35',
        'pv-action': '#167D79',
        'pv-highlight': '#DDF3E7',
        'pv-info': '#2D5E8E',
        'pv-info-bg': '#EAF1F9',
        'pv-muted-bg': '#EEF1EF',
        'pv-ink': '#25342F',
        'pv-ink-light': '#5B6B65',
        'pv-positive': '#1F6B43',
        'pv-positive-bg': '#E7F3EC',
        'pv-on-brand-soft': '#D5E3DC',
        'pv-on-brand-muted': '#A9C9BC',
        'pv-line': '#E3E8E5',
        'pv-line-soft': '#EDF1EE',
        'pv-line-strong': '#B7C2BD',
        // chart accent from the Figma public-dashboard frame (P02)
        'pv-analytics': '#8170B5',
        // analytics chip tone from the Figma public-recommendations frame (P05)
        'pv-analytics-ink': '#5E4F9A',
        'pv-analytics-bg': '#EFEDF7',
        // status tones from the Figma environmental-impacts frame (P03)
        'pv-warning': '#9A4A06',
        'pv-warning-bg': '#FDF1E1',
        'pv-critical': '#B03A3A',
        'pv-critical-bg': '#FBEAEA',
        // full-screen scrim behind the download-confirmation dialog (P08)
        'pv-overlay-scrim': 'rgba(15, 36, 30, 0.48)',
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        sans: ['Source Sans 3', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(36, 52, 61, 0.05)',
        pv: '0 1px 1px rgba(21, 63, 53, 0.05)',
      },
    },
  },
  plugins: [],
}
