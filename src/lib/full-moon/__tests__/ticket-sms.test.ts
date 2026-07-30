import { describe, it, expect } from 'vitest';
import { fullMoonTicketSms } from '@/components/full-moon/event';

/**
 * Confirmation-SMS copy (relayed to GHL as the smsMessage payload field).
 * Allan's copy verbatim, with name/venue/date/time/gate interpolated from
 * event config. If the event is rescheduled, only event.ts changes and these
 * assertions on the derived pieces keep the sentence honest.
 */
describe('fullMoonTicketSms', () => {
  it("renders Allan's copy with the buyer's first name", () => {
    expect(fullMoonTicketSms('Allan')).toBe(
      'Hey Allan, your ticket to the full moon party is confirmed! ' +
        'Boat leaves from Anderson Mill Marina on Friday, August 28th at 7pm sharp! ' +
        'Gate code is 7561#. Questions? Call or text this number. PARTY ON!',
    );
  });

  it('falls back gracefully when the name is missing', () => {
    expect(fullMoonTicketSms('')).toContain('Hey there,');
  });

  it('cannot be reshaped by line breaks in a buyer-typed name', () => {
    const sms = fullMoonTicketSms('Bob\nSTOP');
    expect(sms).not.toContain('\n');
    expect(sms).toContain('Hey Bob STOP,');
  });
});
