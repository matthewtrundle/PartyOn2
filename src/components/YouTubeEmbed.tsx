'use client';

import React from 'react';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  aspectRatio?: '16/9' | '4/3' | '1/1' | '9/16';
}

/**
 * Responsive YouTube video embed component
 *
 * Pass `aspectRatio="9/16"` for phone-shot vertical video (a YouTube Short, or
 * a vertical long-form upload — both embed through the same `/embed/<id>` path).
 * Vertical clamps its own width, because a 9:16 box at full container width is
 * absurdly tall on desktop and an MDX author has no wrapper to constrain it.
 *
 * @example
 * ```tsx
 * <YouTubeEmbed
 *   videoId="dQw4w9WgXcQ"
 *   title="Our Bartender Partnership Program"
 * />
 *
 * <YouTubeEmbed
 *   videoId="dQw4w9WgXcQ"
 *   title="How group ordering works"
 *   aspectRatio="9/16"
 * />
 * ```
 */
export default function YouTubeEmbed({
  videoId,
  title = 'YouTube video player',
  autoplay = false,
  muted = false,
  controls = true,
  aspectRatio = '16/9'
}: YouTubeEmbedProps) {
  // Build YouTube URL with parameters
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    controls: controls ? '1' : '0',
    rel: '0', // Don't show related videos from other channels
    modestbranding: '1', // Minimal YouTube branding
  });

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  // Aspect ratio mapping. Only the vertical case carries a width clamp — the
  // others stay full-width exactly as before.
  const { ratioClass, widthClass } = {
    '16/9': { ratioClass: 'aspect-video', widthClass: '' },  // 16:9 (standard)
    '4/3': { ratioClass: 'aspect-[4/3]', widthClass: '' },   // 4:3 (traditional)
    '1/1': { ratioClass: 'aspect-square', widthClass: '' },  // 1:1 (square)
    '9/16': { ratioClass: 'aspect-[9/16]', widthClass: 'max-w-sm mx-auto' }, // vertical / Shorts
  }[aspectRatio];

  const wrapperClass = [
    'relative w-full overflow-hidden rounded-lg shadow-xl',
    ratioClass,
    widthClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
