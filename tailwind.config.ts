import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF5F5',
          100: '#FFE0E3',
          200: '#FFC2C8',
          300: '#FF8F99',
          400: '#F5596A',
          500: '#E02040',
          600: '#C41230',
          700: '#A00D27',
          800: '#7A0A1E',
          900: '#4A1E00',
        },
        gold: {
          400: '#C4A84A',
          500: '#9B7A2E',
          600: '#7A5E1E',
        },
        cream: {
          50:  '#FFFDF8',
          100: '#FDF6EC',
          200: '#F5E8D0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
