/**
 * Minimal inline SVG icons for the landing template + modals.
 * Design system: all icons are SVG — no emojis in UI. Each icon inherits
 * color from the parent via currentColor and is sized via className.
 */
import type { ReactElement } from 'react';

type IconProps = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Handset outline — tel: links. */
export function PhoneIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/** Message bubble — sms: links. */
export function ChatIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/** Simple check — list bullets. */
export function CheckIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={2.5} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Filled star — freebie / bundle call-outs. */
export function StarIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/** Chevron — accordion/dropdown affordances (rotate via parent). */
export function ChevronDownIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={2.5} aria-hidden="true">
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/** Lightning bolt — last-minute mode banner. */
export function BoltIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z" />
    </svg>
  );
}

/** Circled check — success states. */
export function CheckCircleIcon({ className = 'w-10 h-10' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} strokeWidth={1.6} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8.5 12.2l2.4 2.4 4.8-4.9" />
    </svg>
  );
}

/** Two-person silhouette — group size. */
export function UsersIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Calendar — delivery date. */
export function CalendarIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Box — item count. */
export function BoxIcon({ className = 'w-4 h-4' }: IconProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}
