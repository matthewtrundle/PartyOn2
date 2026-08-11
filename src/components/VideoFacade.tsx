'use client';

import { useState, type ReactElement } from 'react';
import Image from 'next/image';

interface VideoFacadeProps {
  /** YouTube video ID only — not the full URL. Works for Shorts too. */
  videoId: string;
  /** Announced to screen readers and used as the iframe title. */
  title: string;
  /** Local poster still under /public/images, shown until the viewer clicks. */
  posterImage: string;
  aspectRatio?: '16/9' | '9/16';
  /** Tailwind max-width utility clamping the player, e.g. "max-w-[320px] mx-auto". */
  maxWidthClass?: string;
  /** Passed through to next/image. Should match the rendered width. */
  sizes?: string;
}

/**
 * Click-to-play YouTube embed.
 *
 * Sibling to {@link YouTubeEmbed}, which mounts its iframe immediately. Reach
 * for this one ABOVE THE FOLD: a YouTube iframe pulls a large third-party
 * JavaScript payload, and `loading="lazy"` buys nothing in a hero because the
 * frame is already inside the viewport. This renders one optimized local image
 * plus a play control, and only mounts the real player once someone asks for it.
 *
 * The viewer loses nothing — YouTube's own embed also opens on a poster with a
 * play button, so it is the same single click either way.
 *
 * The poster is deliberately a local asset rather than a hotlinked
 * `i.ytimg.com` still: it keeps `next/image` optimization, avoids widening
 * `remotePatterns`, and means no third-party request fires before the click.
 */
export default function VideoFacade({
  videoId,
  title,
  posterImage,
  aspectRatio = '16/9',
  maxWidthClass,
  sizes = '100vw',
}: VideoFacadeProps): ReactElement {
  const [playing, setPlaying] = useState(false);

  const wrapperClass = [
    'relative w-full overflow-hidden rounded-xl shadow-lg border border-white/10',
    aspectRatio === '9/16' ? 'aspect-[9/16]' : 'aspect-video',
    maxWidthClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      {playing ? (
        <iframe
          // autoplay is correct here: the click that mounted this frame WAS the
          // request to play, so the viewer would otherwise have to click twice.
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 w-full h-full cursor-pointer"
        >
          {/* Decorative: the button itself carries the accessible name. */}
          <Image src={posterImage} alt="" fill className="object-cover" sizes={sizes} />
          <span className="absolute inset-0 bg-gray-900/25 transition-colors group-hover:bg-gray-900/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-yellow shadow-xl transition-transform group-hover:scale-105 md:h-20 md:w-20">
              <svg
                className="ml-0.5 h-7 w-7 text-gray-900 md:h-8 md:w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
