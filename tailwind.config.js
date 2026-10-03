/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // The redesign's body font first (loaded in layout via fontVars), Inter as fallback.
        sans: ['var(--pf-font-body)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--pf-font-display)', 'var(--pf-font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--pf-font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // The older pages (blog, projects, contact, admin) use Tailwind's grey and
        // purple. Redefining them here gives all of them the redesign's colours at
        // once, without editing each page. Values match the home page's tokens
        // in app/portfolio.css (--bg, --surface, --line, --ink, --accent).
        gray: {
          50: '#f5f5fb',
          100: '#ecebf7',
          200: '#dcdbec',
          300: '#c3c2d8',
          400: '#9d9cb8',
          500: '#6f6e90',
          600: '#3a3a58',
          700: '#25253d',
          800: '#181829',
          900: '#11111e',
          950: '#07070f',
        },
        primary: '#007AFF',
        secondary: '#6B7280',
        dark: '#1F2937',
        // The admin's accent is indigo; it takes the same violet as the rest.
        indigo: {
          50: '#f6f3ff',
          100: '#ece6ff',
          200: '#d9ccff',
          300: '#c4b0ff',
          400: '#b39dff',
          500: '#9b7bff',
          600: '#8660f0',
          700: '#7048d6',
          800: '#5a3aae',
          900: '#46308a',
        },
        purple: {
          50: '#f6f3ff',
          100: '#ece6ff',
          200: '#d9ccff',
          300: '#c4b0ff',
          400: '#b39dff',
          500: '#9b7bff',
          600: '#8660f0',
          700: '#7048d6',
          800: '#5a3aae',
          900: '#46308a',
        },
      },
      animation: {
        blob: 'blob 7s infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
