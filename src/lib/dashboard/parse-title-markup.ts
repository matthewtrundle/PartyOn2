import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

/**
 * Parses a dashboard title for `~~strikethrough~~` markup and returns a list
 * of ReactNodes — plain text segments interleaved with `<span class="line-through">`
 * segments. Used for the "Ashley's ~~38th~~ 21st Birthday" joke pattern.
 *
 * Input/output examples:
 *   "Plain title"             → ["Plain title"]
 *   "Ashley's ~~38th~~ 21st"  → ["Ashley's ", <span>38th</span>, " 21st"]
 *
 * Unmatched `~~` are rendered as literal text — no fancy recovery, just safe.
 */
export function parseTitleMarkup(input: string): ReactNode[] {
  if (!input) return [input];

  const segments: ReactNode[] = [];
  const regex = /~~([^~]+)~~/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push(input.slice(lastIndex, match.index));
    }
    segments.push(
      createElement(
        'span',
        { key: `s${key++}`, className: 'line-through opacity-70 decoration-[0.12em]' },
        match[1]
      )
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push(input.slice(lastIndex));
  }

  // Wrap in a fragment-friendly array; callers can render directly.
  return segments.length > 0 ? segments : [createElement(Fragment, null, input)];
}
