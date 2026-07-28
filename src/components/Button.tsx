import Link from 'next/link'
import type { ReactElement } from 'react'

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'cart' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

export default function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  fullWidth = false
}: ButtonProps): ReactElement {
  const baseClasses = 'inline-flex items-center justify-center font-sans font-semibold tracking-[0.08em] transition-colors duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-brand-blue text-white hover:bg-blue-700 active:bg-blue-800',
    cart: 'bg-brand-yellow text-gray-900 hover:bg-yellow-400 active:bg-yellow-500',
    secondary: 'bg-white text-brand-blue border-2 border-brand-blue hover:bg-blue-50 active:bg-blue-100',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm md:text-base',
    lg: 'px-8 py-4 text-base md:text-lg'
  }

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`

  if (href) {
    // Forward onClick here too. It used to be dropped on the link branch, so a
    // <Button href onClick> silently did nothing — which quietly breaks
    // click-tracking on any CTA that navigates. Verified no existing caller
    // passed both, so this changes no current behavior.
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  )
}
