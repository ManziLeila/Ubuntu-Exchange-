/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ubuntu International Exchange — dark navy + gold
        brand: {
          50:  '#f9f3e8',
          100: '#f0e2c4',
          200: '#e3c88a',
          300: '#d4af7a',
          400: '#c9a870',
          500: '#b8913a',
          600: '#9a7830',
          700: '#7c5f25',
          800: '#5e471b',
          900: '#3d2f10',
        },
        navy: {
          50:  '#e8ecf2',
          100: '#c5cfe0',
          200: '#8fa3c0',
          300: '#5a769e',
          400: '#2d4e80',
          500: '#1a3360',
          600: '#142748',
          700: '#0f1e38',
          800: '#0a1628',
          900: '#060e1a',
        },
        gold: {
          light: '#f0e2c4',
          DEFAULT: '#c9a870',
          dark:  '#9a7830',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
