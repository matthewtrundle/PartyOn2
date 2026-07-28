/**
 * The typing guard. If this regresses, typing "call me back" into a reply
 * fires the C shortcut — logging a call and skipping the lead mid-sentence.
 */

import { describe, it, expect } from 'vitest';
import { isTypingTarget } from '../use-lead-queue';

/** Minimal stand-in for an event target (duck-typed, so no DOM needed). */
const el = (tagName: string, extra: Record<string, unknown> = {}): EventTarget =>
  ({ tagName, ...extra }) as unknown as EventTarget;

describe('isTypingTarget', () => {
  it('is true for every field the operator can type into', () => {
    expect(isTypingTarget(el('INPUT'))).toBe(true);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('SELECT'))).toBe(true);
    expect(isTypingTarget(el('DIV', { isContentEditable: true }))).toBe(true);
  });

  it('is false for ordinary elements and for nothing at all', () => {
    expect(isTypingTarget(el('DIV'))).toBe(false);
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(el('SECTION', { isContentEditable: false }))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('matches tag names case-insensitively', () => {
    // React/JSDOM report uppercase, but XML-ish documents can report lowercase.
    expect(isTypingTarget(el('textarea'))).toBe(true);
    expect(isTypingTarget(el('input'))).toBe(true);
  });

  it('ignores targets that are not elements', () => {
    expect(isTypingTarget({} as EventTarget)).toBe(false);
    expect(isTypingTarget(el('' as string))).toBe(false);
  });
});
