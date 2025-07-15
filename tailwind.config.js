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
        // Premium Party Color System
        primary: {
          50: '#FFF1ED',
          100: '#FFE3DB',
          200: '#FFC7B7',
          300: '#FFAB93',
          400: '#FF8B5C',
          500: '#FF6B35', // Sunset Orange - Main brand
          600: '#E74C3C',
          700: '#C13E32',
          800: '#9A3228',
          900: '#7A281F',
        },
        secondary: {
          50: '#E8FAF9',
          100: '#D1F5F3',
          200: '#A3EBE7',
          300: '#75E1DB',
          400: '#6DD9D1',
          500: '#4ECDC4', // Fresh Teal
          600: '#3DB5AC',
          700: '#329590',
          800: '#267574',
          900: '#1B5558',
        },
        accent: {
          50: '#FFFDF5',
          100: '#FFFBEB',
          200: '#FFF7D6',
          300: '#FFF3A3',
          400: '#FFEF85',
          500: '#FFE66D', // Champagne Yellow
          600: '#F5D640',
          700: '#E0C030',
          800: '#B89D26',
          900: '#8F7A1D',
        },
        dark: {
          50: '#F8F9FA',
          100: '#E9ECEF',
          200: '#DEE2E6',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#6C757D',
          600: '#495057',
          700: '#2D3436', // Soft Charcoal
          800: '#212529',
          900: '#191C1F',
        },
        // Legacy colors for backward compatibility
        gold: {
          50: '#FFFDF5',
          100: '#FFFBEB',
          200: '#FFF7D6',
          300: '#FFF3A3',
          400: '#FFEF85',
          500: '#FFE66D',
          600: '#F5D640',
          700: '#E0C030',
          800: '#B89D26',
          900: '#8F7A1D',
        },
        navy: {
          50: '#F8F9FA',
          100: '#E9ECEF',
          200: '#DEE2E6',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#2D3436',
          600: '#495057',
          700: '#343A40',
          800: '#212529',
          900: '#191C1F',
        },
        austin: {
          sunset: '#FF6B35',
          lake: '#4ECDC4',
          hills: '#4A7C59',
          live: '#E74C3C',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'party': 'party 1s ease-in-out',
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
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        party: {
          '0%': { transform: 'scale(1) rotate(0deg)' },
          '25%': { transform: 'scale(1.1) rotate(5deg)' },
          '50%': { transform: 'scale(1) rotate(-5deg)' },
          '75%': { transform: 'scale(1.1) rotate(5deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #FF6B35 0%, #E74C3C 100%)',
        'gradient-fun': 'linear-gradient(135deg, #FF6B35 0%, #4ECDC4 50%, #FFE66D 100%)',
        'gradient-party': 'linear-gradient(45deg, #FF6B35, #FFE66D, #4ECDC4, #FF6B35)',
      },
      boxShadow: {
        'premium': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'premium-hover': '0 8px 30px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(255, 107, 53, 0.3)',
        'party': '0 0 30px rgba(255, 107, 53, 0.4), 0 0 60px rgba(78, 205, 196, 0.2)',
      },
    },
  },
  plugins: [],
}