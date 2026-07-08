import type { ReactElement, ReactNode } from 'react';

/**
 * Inline line/solid SVG icons for the Full Moon Party page, ported from the
 * design prototype. Kept local (no lucide-react dependency in this app).
 * All decorative — callers wrap with their own aria context.
 */
export type IconName =
  | 'sun'
  | 'moon'
  | 'taco'
  | 'bottle'
  | 'boat'
  | 'dj'
  | 'lights'
  | 'people'
  | 'captain'
  | 'share'
  | 'messages'
  | 'whatsapp'
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'mail'
  | 'native'
  | 'copy'
  | 'chevronLeft'
  | 'chevronRight'
  | 'plus'
  | 'check'
  | 'pin';

const PATHS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="14" r="3.5" />
      <path d="M12 6.5V4M5.6 9.6 4 8M18.4 9.6 20 8M12 14h9M3 14h2M2 19h20" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 10.5Z" />,
  taco: (
    <>
      <path d="M3.5 13.5h17a8.5 8.5 0 0 0-17 0Z" />
      <path d="M2 17.5c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" />
    </>
  ),
  bottle: <path d="M9 3h6M9 3v3.5L6.5 11A4 4 0 0 0 10 17v4M15 3v3.5L17.5 11A4 4 0 0 1 14 17v4M8 21h8M7.2 9h9.6" />,
  boat: <path d="M3 17c1.5 1 3 1 4.5 0S10.5 16 12 17s3 1 4.5 0S19.5 16 21 17M4 17l1-5h14l1 5M8 12V7h8v5" />,
  dj: <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  lights: <path d="M3 7h18M5 7l1.5 3M19 7l-1.5 3M7 10c1 .8 1 .8 2.5 0s1.5-.8 2.5 0 1 .8 2.5 0 1.5-.8 2.5 0M8 13h8M9 13l1 7M15 13l-1 7" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20a7 7 0 0 1 14 0M16 5a3 3 0 0 1 0 6M17 14a7 7 0 0 1 5 6" />
    </>
  ),
  captain: <path d="M4 16s2-1 4 0 4 1 6 0M2 20h20M6 12V6l6-3 6 3v6M12 3v6" />,
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  messages: <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z" />,
  whatsapp: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z" />
      <path
        d="M8.5 9.2c0 3 2.3 5.3 5.3 5.3.6 0 1-.5 1-.5l-1.3-1-1 .6c-1.2-.5-2.1-1.4-2.6-2.6l.6-1-1-1.3s-.5.4-.5 1Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  x: <path d="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L8 21H5l7.4-8.5L4.5 3H11l4.5 5.6L17.5 3Zm-1.1 16h1.7L8 4.8H6.2L16.4 19Z" />,
  facebook: <path d="M14 9V7.2c0-.8.5-1 .9-1H16V3.5h-2.2C11 3.5 10.5 5.6 10.5 7v2H8.7v2.7h1.8V21H14v-9.3h2.3l.4-2.7H14Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  native: <path d="M12 16V4M8 8l4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6 9 17l-5-5" />,
  pin: (
    <>
      <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
};

/** Icons rendered with a solid fill instead of a stroke. */
const SOLID: ReadonlySet<IconName> = new Set(['x', 'facebook']);

interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

/** Render one of the named 24×24 icons. */
export function Icon({ name, className, strokeWidth = 1.5 }: IconProps): ReactElement {
  const solid = SOLID.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={solid ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
