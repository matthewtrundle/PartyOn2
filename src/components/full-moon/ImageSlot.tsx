'use client';

import Image from 'next/image';
import type { CSSProperties, ReactElement } from 'react';

interface ImageSlotProps {
  /** Public path under /public, or null/undefined to show the gradient placeholder. */
  src?: string | null;
  alt: string;
  /** Applied to the fill wrapper (usually a module class that sets size). */
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Shown centered when there is no photo. */
  placeholderLabel?: string;
  onClick?: () => void;
}

const PLACEHOLDER: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(165deg,#2a2350 0%,#3a2a55 40%,#6b2c5e 75%,#2a1f44 100%)',
  display: 'grid',
  placeItems: 'center',
  padding: '18px',
};

/**
 * A drop-target image container: renders an optimized photo if `src` is set,
 * otherwise an on-brand gradient placeholder (so unfilled slots still read as
 * intentional). Replaces the prototype's `<image-slot>` web component.
 */
export default function ImageSlot({
  src,
  alt,
  className,
  sizes = '(max-width: 900px) 100vw, 50vw',
  priority = false,
  placeholderLabel,
  onClick,
}: ImageSlotProps): ReactElement {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />
      ) : (
        <div aria-hidden="true" style={PLACEHOLDER}>
          {placeholderLabel ? (
            <span
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.45)',
                textAlign: 'center',
                maxWidth: '260px',
              }}
            >
              {placeholderLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
