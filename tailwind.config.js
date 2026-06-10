/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        'brand-blue': '#0B74B8',
        'brand-blue-dark': '#085286',
        'brand-yellow': '#F2D34F',
        'gold': '#D4AF37', // Premium accent - ONLY on dark backgrounds
        'cream': '#FAF6EE',
        'navy': '#0A1F33',

        // Neutrals
        white: '#FFFFFF',
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          500: '#6B7280',
          700: '#374151',
          900: '#111827',
        },
        black: '#191C1F',

        // Functional (status feedback only)
        success: '#16A34A',
        error: '#DC2626',
        warning: '#F59E0B',

        // Keep default Tailwind colors we need for dynamic category colors
        amber: colors.amber,
        pink: colors.pink,
        teal: colors.teal,
        cyan: colors.cyan,
        purple: colors.purple,
        indigo: colors.indigo,
        blue: colors.blue,
        yellow: colors.yellow,
        red: colors.red,
        green: colors.green,
      },
      fontFamily: {
        heading: ['var(--font-barlow-condensed)', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
        manrope: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'party': 'party 1s ease-in-out',
        'scroll-left': 'scrollLeft 40s linear infinite',
        'bounce-horizontal': 'bounceHorizontal 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
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
        scrollLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        bounceHorizontal: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(8px)' },
        },
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'premium': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'premium-hover': '0 8px 30px rgba(0, 0, 0, 0.15)',
        // Direction E warm-tinted shadows -- use on cream surfaces in place of
        // the cool gray shadows that read as washed-out on warm backgrounds.
        'warm-sm': '0 2px 8px rgba(80,40,10,0.08)',
        'warm-md': '0 4px 14px rgba(80,40,10,0.12)',
        'warm-lg': '0 8px 24px rgba(80,40,10,0.18)',
      },
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
  safelist: [
    // Safelist color classes for dynamic category colors
    'bg-amber-50', 'bg-amber-100', 'bg-amber-600',
    'text-amber-700', 'text-white',
    'border-amber-300', 'border-amber-400', 'border-amber-600',
    'hover:bg-amber-100', 'hover:border-amber-400', 'hover:border-amber-500',

    'bg-pink-50', 'bg-pink-100', 'bg-pink-600',
    'text-pink-700',
    'border-pink-300', 'border-pink-400', 'border-pink-600',
    'hover:bg-pink-100', 'hover:border-pink-400', 'hover:border-pink-500',

    'bg-teal-50', 'bg-teal-100', 'bg-teal-600',
    'text-teal-700',
    'border-teal-300', 'border-teal-400', 'border-teal-600',
    'hover:bg-teal-100', 'hover:border-teal-400', 'hover:border-teal-500',

    'bg-cyan-50', 'bg-cyan-100', 'bg-cyan-600',
    'text-cyan-700',
    'border-cyan-300', 'border-cyan-400', 'border-cyan-600',
    'hover:bg-cyan-100', 'hover:border-cyan-400',

    'bg-purple-50', 'bg-purple-100', 'bg-purple-600',
    'text-purple-700',
    'border-purple-300', 'border-purple-400', 'border-purple-600',
    'hover:bg-purple-100', 'hover:border-purple-400', 'hover:border-purple-500',

    'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-600',
    'text-indigo-700',
    'border-indigo-300', 'border-indigo-400', 'border-indigo-600',
    'hover:bg-indigo-100', 'hover:border-indigo-400', 'hover:border-indigo-500',

    'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-500', 'bg-gray-700', 'bg-gray-900',
    'text-gray-500', 'text-gray-700', 'text-gray-900',
    'border-gray-200', 'border-gray-300',
    'hover:bg-gray-100',

    // Brand colors
    'bg-brand-blue', 'bg-brand-blue-dark', 'bg-brand-yellow', 'bg-gold', 'bg-cream', 'bg-navy',
    'text-brand-blue', 'text-brand-yellow', 'text-gold', 'text-cream', 'text-navy',
    'border-brand-blue', 'border-brand-yellow', 'border-gold', 'border-cream', 'border-navy',
    'hover:bg-blue-700', 'hover:bg-yellow-400',
    'active:bg-blue-800', 'active:bg-yellow-500',
    'focus:ring-brand-blue',
  ],
}
