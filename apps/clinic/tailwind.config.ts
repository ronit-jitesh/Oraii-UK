import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        oraii: {
          primary:      '#2D6A4F',
          'primary-dk': '#1B4332',
          'primary-md': '#40916C',
          light:        '#D8EDDF',
          bg:           '#F7F5F0',
          border:       '#E2DDD5',
          muted:        '#6B7280',
        },
      },
      fontFamily: {
        heading: ['Lora', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
