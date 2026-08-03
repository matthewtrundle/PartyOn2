/**
 * generateVideoSchema: the VideoObject JSON-LD behind video rich results.
 *
 * The chapter -> Clip mapping is the part worth guarding. Google reads
 * `hasPart` to build the "key moments" jump links, and every chapter title in
 * our videos IS a target keyword, so a broken offset chain silently costs the
 * feature the whole video was built to win.
 */

import { describe, it, expect } from 'vitest';
import { generateVideoSchema } from '../schemas';

const PAGE_URL = 'https://partyondelivery.com/austin-bachelorette-party-delivery';

const BASE = {
  videoId: 'abc123XYZ',
  title: 'How to Plan a Bachelorette Party — 10 Questions in 4 Minutes',
  description: 'The ten questions every bach party group asks, answered fast.',
  uploadDate: '2026-08-20',
};

describe('generateVideoSchema', () => {
  it('emits a valid VideoObject with YouTube URLs derived from the video ID', () => {
    const schema = generateVideoSchema(BASE, PAGE_URL);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('VideoObject');
    expect(schema.name).toBe(BASE.title);
    expect(schema.description).toBe(BASE.description);
    expect(schema.uploadDate).toBe('2026-08-20');
    expect(schema.embedUrl).toBe('https://www.youtube.com/embed/abc123XYZ');
    expect(schema.contentUrl).toBe('https://www.youtube.com/watch?v=abc123XYZ');
  });

  it('defaults the thumbnail to the YouTube still for that video', () => {
    const schema = generateVideoSchema(BASE, PAGE_URL);
    expect(schema.thumbnailUrl).toBe('https://i.ytimg.com/vi/abc123XYZ/hqdefault.jpg');
  });

  it('prefers an explicit thumbnail when one is supplied', () => {
    const schema = generateVideoSchema(
      { ...BASE, thumbnailUrl: 'https://partyondelivery.com/images/bach-thumb.jpg' },
      PAGE_URL,
    );
    expect(schema.thumbnailUrl).toBe('https://partyondelivery.com/images/bach-thumb.jpg');
  });

  it('omits duration and hasPart entirely when neither is supplied', () => {
    const schema = generateVideoSchema(BASE, PAGE_URL);
    expect(schema).not.toHaveProperty('duration');
    expect(schema).not.toHaveProperty('hasPart');
  });

  it('chains each chapter end offset to the next chapter start', () => {
    const schema = generateVideoSchema(
      {
        ...BASE,
        duration: 'PT4M40S',
        chapters: [
          { name: 'How do you plan a bachelorette party?', startOffsetSeconds: 12 },
          { name: 'Who pays for the bachelorette party?', startOffsetSeconds: 38 },
          { name: 'Where should the group stay in Austin?', startOffsetSeconds: 244 },
        ],
      },
      PAGE_URL,
    );

    const clips = schema.hasPart as Array<Record<string, unknown>>;
    expect(clips).toHaveLength(3);

    expect(clips[0]).toMatchObject({
      '@type': 'Clip',
      name: 'How do you plan a bachelorette party?',
      startOffset: 12,
      endOffset: 38,
      url: `${PAGE_URL}#t=12`,
    });
    expect(clips[1]).toMatchObject({ startOffset: 38, endOffset: 244 });
  });

  it('closes the final chapter at the parsed video duration', () => {
    const schema = generateVideoSchema(
      {
        ...BASE,
        duration: 'PT4M40S', // 280s
        chapters: [{ name: 'Only chapter', startOffsetSeconds: 12 }],
      },
      PAGE_URL,
    );

    const clips = schema.hasPart as Array<Record<string, unknown>>;
    expect(clips[0].endOffset).toBe(280);
    expect(schema.duration).toBe('PT4M40S');
  });

  it('leaves the final chapter open-ended when no duration is given', () => {
    const schema = generateVideoSchema(
      { ...BASE, chapters: [{ name: 'Only chapter', startOffsetSeconds: 12 }] },
      PAGE_URL,
    );

    const clips = schema.hasPart as Array<Record<string, unknown>>;
    expect(clips[0]).not.toHaveProperty('endOffset');
  });

  it('parses hour-length durations', () => {
    const schema = generateVideoSchema(
      {
        ...BASE,
        duration: 'PT1H2M3S',
        chapters: [{ name: 'Only chapter', startOffsetSeconds: 0 }],
      },
      PAGE_URL,
    );

    const clips = schema.hasPart as Array<Record<string, unknown>>;
    expect(clips[0].endOffset).toBe(3723);
  });

  it('drops the end offset rather than guessing when the duration is unparseable', () => {
    const schema = generateVideoSchema(
      {
        ...BASE,
        duration: '4:40', // not ISO 8601
        chapters: [{ name: 'Only chapter', startOffsetSeconds: 12 }],
      },
      PAGE_URL,
    );

    const clips = schema.hasPart as Array<Record<string, unknown>>;
    expect(clips[0]).not.toHaveProperty('endOffset');
  });
});
