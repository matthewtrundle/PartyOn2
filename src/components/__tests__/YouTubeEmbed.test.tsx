/**
 * YouTubeEmbed aspect-ratio handling.
 *
 * The fall 2026 videos were all shot vertically on a phone, so `9/16` was added
 * to a component that had been 16:9-locked. Two things are worth pinning: that
 * vertical clamps its own width (an unclamped 9:16 box is absurdly tall on
 * desktop, and an MDX author has no wrapper to constrain it), and that the
 * default output did NOT change — the partner landers and every existing blog
 * embed pass no ratio at all, so a drift there is a silent site-wide regression.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import YouTubeEmbed from '../YouTubeEmbed';

/** The wrapper div that carries the aspect-ratio and width classes. */
function wrapperFor(title: string): HTMLElement {
  const iframe = screen.getByTitle(title);
  const wrapper = iframe.parentElement;
  if (!wrapper) throw new Error('embed iframe has no wrapper element');
  return wrapper;
}

describe('YouTubeEmbed aspect ratios', () => {
  it('defaults to 16:9 with no width clamp', () => {
    render(<YouTubeEmbed videoId="abc123XYZ" title="Default embed" />);
    const wrapper = wrapperFor('Default embed');

    expect(wrapper.className).toBe(
      'relative w-full overflow-hidden rounded-lg shadow-xl aspect-video',
    );
    expect(wrapper.className).not.toContain('max-w-sm');
    expect(wrapper.className).not.toContain('mx-auto');
  });

  it('renders vertical footage as 9:16 and clamps its width', () => {
    render(
      <YouTubeEmbed videoId="abc123XYZ" title="Vertical embed" aspectRatio="9/16" />,
    );
    const wrapper = wrapperFor('Vertical embed');

    expect(wrapper.className).toContain('aspect-[9/16]');
    expect(wrapper.className).toContain('max-w-sm');
    expect(wrapper.className).toContain('mx-auto');
    // The 16:9 class must not linger alongside it.
    expect(wrapper.className).not.toContain('aspect-video');
  });

  it.each([
    ['16/9', 'aspect-video'],
    ['4/3', 'aspect-[4/3]'],
    ['1/1', 'aspect-square'],
  ] as const)('leaves %s unclamped', (ratio, expectedClass) => {
    render(
      <YouTubeEmbed videoId="abc123XYZ" title={`Embed ${ratio}`} aspectRatio={ratio} />,
    );
    const wrapper = wrapperFor(`Embed ${ratio}`);

    expect(wrapper.className).toContain(expectedClass);
    expect(wrapper.className).not.toContain('max-w-sm');
  });
});

describe('YouTubeEmbed iframe src', () => {
  it('builds the embed URL from the video ID with related videos off', () => {
    render(<YouTubeEmbed videoId="abc123XYZ" title="URL embed" />);
    const src = screen.getByTitle('URL embed').getAttribute('src') ?? '';

    expect(src.startsWith('https://www.youtube.com/embed/abc123XYZ?')).toBe(true);

    const params = new URLSearchParams(src.split('?')[1]);
    expect(params.get('rel')).toBe('0');
    expect(params.get('modestbranding')).toBe('1');
    expect(params.get('autoplay')).toBe('0');
    expect(params.get('mute')).toBe('0');
    expect(params.get('controls')).toBe('1');
  });

  it('carries autoplay and mute through when asked', () => {
    render(
      <YouTubeEmbed videoId="abc123XYZ" title="Autoplay embed" autoplay muted />,
    );
    const src = screen.getByTitle('Autoplay embed').getAttribute('src') ?? '';
    const params = new URLSearchParams(src.split('?')[1]);

    expect(params.get('autoplay')).toBe('1');
    expect(params.get('mute')).toBe('1');
  });

  it('lazy-loads and allows fullscreen', () => {
    render(<YouTubeEmbed videoId="abc123XYZ" title="Attrs embed" />);
    const iframe = screen.getByTitle('Attrs embed');

    expect(iframe.getAttribute('loading')).toBe('lazy');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  });
});
