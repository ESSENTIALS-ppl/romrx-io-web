/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ROMRx HQ (corporate + base product) - Cobalt system per v3.2 sec 3a
        cobalt: {
          DEFAULT: '#1D4ED8',
          dark:    '#1E3A8A',
          light:   '#EEF3FF',
          ink:     '#0F172A',
        },
        // Sport accents used on My Sport cards (each product's own hue)
        sportAccent: {
          bjj:            '#008080', // teal
          bodybuilding:   '#FF1493', // Miami Vice hot pink
          powerlifting:   '#7C3AED',
          mma:            '#DC2626',
          yoga:           '#059669',
          firstresponder: '#F59E0B',
        },
        // Score tier colors (shared across products)
        tier: {
          elite:      '#0F766E',
          strong:     '#14B8A6',
          developing: '#CA8A04',
          restricted: '#EA580C',
          risk:       '#B91C1C',
        },
        surface:  '#F8FAFC',
        neutral9: '#0F172A',
      },
      fontFamily: {
        sans:    ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
