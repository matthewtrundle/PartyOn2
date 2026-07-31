import { describe, expect, it } from 'vitest';
import { BOUNCE_REASON_MAX_LENGTH, formatBounceReason } from '../bounce-reason';

describe('formatBounceReason', () => {
  it('composes type/subType: message', () => {
    expect(
      formatBounceReason({
        type: 'Permanent',
        subType: 'General',
        message: "The recipient's mailbox does not exist.",
      }),
    ).toBe("Permanent/General: The recipient's mailbox does not exist.");
  });

  it('handles message-only bounces', () => {
    expect(formatBounceReason({ message: 'Mailbox full' })).toBe('Mailbox full');
  });

  it('handles type-only bounces', () => {
    expect(formatBounceReason({ type: 'Transient' })).toBe('Transient');
  });

  it('handles subType-only bounces', () => {
    expect(formatBounceReason({ subType: 'MailboxFull' })).toBe('MailboxFull');
  });

  it('joins type and subType without a message', () => {
    expect(formatBounceReason({ type: 'Permanent', subType: 'Suppressed' })).toBe(
      'Permanent/Suppressed',
    );
  });

  it('returns null for a missing bounce object', () => {
    expect(formatBounceReason(undefined)).toBeNull();
    expect(formatBounceReason(null)).toBeNull();
  });

  it('returns null when every field is empty or whitespace', () => {
    expect(formatBounceReason({})).toBeNull();
    expect(formatBounceReason({ type: '  ', subType: '', message: ' ' })).toBeNull();
  });

  it('ignores non-string fields from a malformed payload', () => {
    expect(
      formatBounceReason({
        type: 42 as unknown as string,
        message: 'still works',
      }),
    ).toBe('still works');
  });

  it('clamps oversized messages to the max length', () => {
    const long = formatBounceReason({ type: 'Permanent', message: 'x'.repeat(2000) });
    expect(long).not.toBeNull();
    expect(long!.length).toBe(BOUNCE_REASON_MAX_LENGTH);
    expect(long!.startsWith('Permanent: xxx')).toBe(true);
  });
});
