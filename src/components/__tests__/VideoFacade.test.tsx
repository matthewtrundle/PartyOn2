/**
 * VideoFacade: the click-to-play wrapper used in the partner hero.
 *
 * The whole reason this component exists is that NO YouTube iframe should be in
 * the document until someone asks for one — that is what keeps a third-party JS
 * payload out of the hero's paint. So the load-bearing assertion here is the
 * negative one: no iframe before the click. If that regresses, the component is
 * pointless and nothing else would fail.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoFacade from '../VideoFacade';

const BASE = {
  videoId: 'R9vhASE29xc',
  title: 'PartyOn Delivery at Lake Travis Yacht Rentals',
  posterImage: '/images/partners/ltyr-marina-video-poster.webp',
};

describe('VideoFacade before the click', () => {
  it('mounts no iframe at all', () => {
    const { container } = render(<VideoFacade {...BASE} />);
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('exposes a play control naming the video', () => {
    render(<VideoFacade {...BASE} />);
    expect(
      screen.getByRole('button', {
        name: 'Play video: PartyOn Delivery at Lake Travis Yacht Rentals',
      }),
    ).toBeTruthy();
  });

  it('renders the poster as decorative, since the button carries the name', () => {
    const { container } = render(<VideoFacade {...BASE} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('');
  });
});

describe('VideoFacade after the click', () => {
  it('mounts the player and autoplays, because the click was the request to play', () => {
    const { container } = render(<VideoFacade {...BASE} />);

    fireEvent.click(screen.getByRole('button'));

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();

    const src = iframe?.getAttribute('src') ?? '';
    expect(src.startsWith('https://www.youtube.com/embed/R9vhASE29xc?')).toBe(true);

    const params = new URLSearchParams(src.split('?')[1]);
    expect(params.get('autoplay')).toBe('1');
    expect(params.get('rel')).toBe('0');
    expect(params.get('modestbranding')).toBe('1');
  });

  it('drops the poster once the player is up', () => {
    const { container } = render(<VideoFacade {...BASE} />);

    fireEvent.click(screen.getByRole('button'));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('VideoFacade shape', () => {
  it('clamps and squares up vertical footage when asked', () => {
    const { container } = render(
      <VideoFacade {...BASE} aspectRatio="9/16" maxWidthClass="max-w-[320px] mx-auto" />,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toContain('aspect-[9/16]');
    expect(wrapper.className).toContain('max-w-[320px]');
    expect(wrapper.className).not.toContain('aspect-video');
  });

  it('defaults to 16:9 with no clamp', () => {
    const { container } = render(<VideoFacade {...BASE} />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toContain('aspect-video');
    expect(wrapper.className).not.toContain('max-w-');
  });
});
