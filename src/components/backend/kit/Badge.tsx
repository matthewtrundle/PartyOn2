import { ReactElement, ReactNode } from 'react';

/**
 * HQ status badge (backend kit — distinct from the customer ui/Badge).
 * Rule from the design spec: tinted bg + dark text = a state; solid fill =
 * act NOW; the yellow chip is a brand flag (XL/BOAT), never a state.
 */
export type HqBadgeVariant =
  | 'green'
  | 'blue'
  | 'amber'
  | 'red'
  | 'gray'
  | 'solid-green'
  | 'solid-red'
  | 'brand';

const VARIANTS: Record<HqBadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-500',
  'solid-green': 'bg-green-600 text-white',
  'solid-red': 'bg-red-600 text-white',
  brand: 'bg-brand-yellow text-gray-900',
};

export default function HqBadge({
  variant,
  children,
  className = '',
}: {
  variant: HqBadgeVariant;
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <span
      className={`inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase whitespace-nowrap ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
