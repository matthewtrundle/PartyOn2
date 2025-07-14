/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium gold palette
        gold: {
          50: '#FFF9E6',
          100: '#FFF2CC',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#F5B800', // Main gold
          600: '#CC9A00',
          700: '#997300',
          800: '#664D00',
          900: '#332600',
        },
        // Deep navy palette
        navy: {
          50: '#E6E9F0',
          100: '#CCD3E1',
          200: '#99A7C3',
          300: '#667AA5',
          400: '#334E87',
          500: '#002147', // Main navy
          600: '#001B39',
          700: '#00142B',
          800: '#000E1D',
          900: '#00070F',
        },
        // Austin-inspired accent colors
        austin: {
          sunset: '#FF6B35', // Warm orange sunset
          lake: '#18C0D6', // Lake Travis blue
          hills: '#4A7C59', // Hill Country green
          live: '#E74C3C', // Live music red
        },
        // Neutral palette
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #F5B800 0%, #FFCC33 100%)',
        'gradient-navy': 'linear-gradient(135deg, #002147 0%, #334E87 100%)',
      },
      boxShadow: {
        'premium': '0 5px 20px rgba(0, 0, 0, 0.08)',
        'premium-hover': '0 10px 30px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 15px rgba(245, 184, 0, 0.3)',
      },
    },
  },
  plugins: [],
}