// Shared video config for the combined bachelor + bachelorette video.
//
// ONE video serves both landers (see docs/seo/bach-video-brief-2026-07.md —
// bachelorette carries ~3x bachelor search volume, so it's bachelorette-led
// with two bachelor chapters). Keeping the chapter data here rather than in
// each config means the two landers can't drift apart on timestamps, and the
// VideoObject "key moments" stay identical across both pages.
//
// ─── TO GO LIVE ───────────────────────────────────────────────────────────
// Once the video is uploaded to YouTube:
//   1. Confirm the real chapter start times against the final cut and update
//      `BACH_VIDEO_CHAPTERS` below (the times here come from the script's
//      target runtimes, not from a finished edit).
//   2. In bachelor.ts and bachelorette.ts add:
//        video: buildBachVideo({ videoId: '<id>', uploadDate: '<YYYY-MM-DD>', duration: 'PT4M40S' }),
// Nothing renders and no schema is emitted until that line exists.

import type { LandingVideo } from '../types';

/**
 * The 10 chapters, in order. Each name is the exact question said on camera
 * and shown on screen — it IS the target keyword, so do not paraphrase these
 * when editing. Start offsets are in seconds.
 *
 * Source: docs/seo/bach-video-script-2026-07.md (v1.1, shoot-ready).
 */
export const BACH_VIDEO_CHAPTERS: LandingVideo['chapters'] = [
  { name: 'How do you plan a bachelorette party?', startOffsetSeconds: 12 },
  { name: 'Who pays for the bachelorette party?', startOffsetSeconds: 38 },
  { name: 'How much does a bachelorette weekend cost in Austin?', startOffsetSeconds: 62 },
  { name: 'When should the bach party happen — and how far out do you book?', startOffsetSeconds: 90 },
  { name: 'What do you actually do at an Austin bachelorette party?', startOffsetSeconds: 116 },
  { name: 'How much alcohol do you actually need?', startOffsetSeconds: 144 },
  { name: 'What goes in the cooler for a Lake Travis boat day?', startOffsetSeconds: 176 },
  { name: 'Who plans the bachelor party — and who pays?', startOffsetSeconds: 206 },
  { name: 'How do you plan a bachelor party in Austin?', startOffsetSeconds: 224 },
  { name: 'Where should the group stay in Austin?', startOffsetSeconds: 244 },
];

/**
 * Build the shared bach video config for a lander.
 *
 * @param opts.videoId - YouTube video ID (not the full URL).
 * @param opts.uploadDate - ISO date the video went live, e.g. "2026-08-20".
 * @param opts.duration - Optional ISO 8601 duration, e.g. "PT4M40S". Supplying
 *   it lets the schema close the final chapter's end offset.
 * @returns A LandingVideo ready to drop into a landing config's `video` field.
 */
export function buildBachVideo(opts: {
  videoId: string;
  uploadDate: string;
  duration?: string;
}): LandingVideo {
  return {
    videoId: opts.videoId,
    // Shot vertically on a phone, like everything from the fall 2026 shoot. At
    // ~4:15 it is too long to be a Short (YouTube's ceiling is ~3 min), so it
    // uploads as vertical long-form — which keeps the chapters this config
    // exists to declare. Shorts do not support chapters.
    orientation: 'vertical',
    uploadDate: opts.uploadDate,
    duration: opts.duration,
    heading: 'Watch: 10 bach party questions, answered in 4 minutes',
    blurb:
      'Every group planning a bachelor or bachelorette weekend asks the same ten questions. Here are the answers — who pays, what it costs, when to book, and what actually goes in the cooler.',
    title:
      'How to Plan a Bachelorette (or Bachelor) Party — 10 Questions Answered in 4 Minutes',
    description:
      'The ten questions every bachelor and bachelorette party group asks, answered fast: who plans it, who pays, what an Austin weekend really costs, how far ahead to book, how much alcohol you need, and what goes in the cooler for a Lake Travis boat day.',
    chapters: BACH_VIDEO_CHAPTERS,
  };
}
