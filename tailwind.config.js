/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        'barber': {
          'dark': '#1a1a2e',
          'darker': '#0f0f1a',
          'gold': '#e6b325',
          'gold-light': '#f4d03f',
          'gold-dark': '#c9a227',
          'cream': '#f8f5f0',
          'brown': '#3d2914',
          'gray': '#2d2d44',
          'silver': '#9ca3af',
        }
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'Georgia', 'serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(230, 179, 37, 0.3)',
        'card': '0 10px 40px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'number-pop': 'number-pop 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(230, 179, 37, 0.4)' },
          '50%': { boxShadow: '0 0 0 15px rgba(230, 179, 37, 0)' },
        },
        'number-pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
