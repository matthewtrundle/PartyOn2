/**
 * Vertical classification for inbound partner inquiries. The form's
 * businessType is free text, so the mapper must be conservative: a wrong
 * vertical tag is worse than no tag (it lands the lead in the wrong
 * prospect-vertical view).
 */

import { describe, it, expect } from 'vitest';
import { isPartnerLead, verticalForBusinessType } from '../partner-tags';

describe('verticalForBusinessType', () => {
  it('maps the values the live forms actually submit', () => {
    // /partners/mobile-bartenders hard-codes these two.
    expect(verticalForBusinessType('Mobile Bartender')).toBe('bartender');
    expect(verticalForBusinessType('Mobile Bartenders')).toBe('bartender');
    // /partners/vacation-rentals.
    expect(verticalForBusinessType('Vacation Rental')).toBe('str');
    // /austin-partners dropdown values.
    expect(verticalForBusinessType('hotel')).toBe('str');
    expect(verticalForBusinessType('property')).toBe('str');
  });

  it('matches the other phrasings each vertical shows up as', () => {
    expect(verticalForBusinessType('mobile bar co')).toBe('bartender');
    expect(verticalForBusinessType('Bar Service')).toBe('bartender');
    expect(verticalForBusinessType('short-term rental manager')).toBe('str');
    expect(verticalForBusinessType('STR')).toBe('str');
    expect(verticalForBusinessType('Airbnb host')).toBe('str');
    expect(verticalForBusinessType('Event Space')).toBe('venue');
    expect(verticalForBusinessType('BYOB venue')).toBe('venue');
  });

  it('returns null rather than guessing', () => {
    expect(verticalForBusinessType(null)).toBeNull();
    expect(verticalForBusinessType(undefined)).toBeNull();
    expect(verticalForBusinessType('')).toBeNull();
    expect(verticalForBusinessType('corporate')).toBeNull();
    expect(verticalForBusinessType('restaurant')).toBeNull();
    expect(verticalForBusinessType('other')).toBeNull();
  });

  it('prefers bartender when a bar service also mentions venues', () => {
    // First-match-wins ordering: the bartender pattern is checked first, so a
    // mobile bar that serves venues is tagged by what the business IS.
    expect(verticalForBusinessType('mobile bartending for event venues')).toBe('bartender');
  });
});

describe('isPartnerLead', () => {
  it('keys off the prospect tag only, never the vertical tag', () => {
    expect(isPartnerLead(['partner-prospect', 'str'])).toBe(true);
    // A vertical tag alone (an inbound inquiry) is NOT an outbound prospect.
    expect(isPartnerLead(['bartender'])).toBe(false);
    expect(isPartnerLead([])).toBe(false);
    expect(isPartnerLead(null)).toBe(false);
  });
});
