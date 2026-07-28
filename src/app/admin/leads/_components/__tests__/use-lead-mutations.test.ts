/**
 * The stage-move success check. transitionStage answers
 * { ok: true, moved: false } when it loses a race or the card is already in the
 * target stage — and the route still returns HTTP 200. Reading that as success
 * would report a move that never happened (and, in the work queue, log an
 * outcome for it), so it must count as a failure.
 */

import { describe, it, expect } from 'vitest';
import { stageMoved } from '../use-lead-mutations';

describe('stageMoved', () => {
  it('rejects a 200 that reports the card did not move', () => {
    expect(stageMoved({ success: true, data: { moved: false, reason: 'concurrent-change' } })).toBe(
      false,
    );
    expect(stageMoved({ success: true, data: { moved: false, reason: 'same-stage' } })).toBe(false);
  });

  it('accepts a real move', () => {
    expect(stageMoved({ success: true, data: { moved: true, reason: null } })).toBe(true);
  });

  it('does not fail closed when the payload lacks the flag', () => {
    // Only an explicit moved:false is a failure — an unparseable or differently
    // shaped body falls back to the HTTP status the caller already checked.
    expect(stageMoved({ success: true, data: {} })).toBe(true);
    expect(stageMoved({})).toBe(true);
    expect(stageMoved(null)).toBe(true);
  });
});
