/**
 * Vertical classification for inbound partner inquiries. The form's
 * businessType is free text, so the mapper must be conservative: a wrong
 * vertical tag is worse than no tag (it lands the lead in the wrong
 * prospect-vertical view).
 */

import { describe, it, expect } from 'vitest';
import { isB2bBusinessType, isPartnerLead, verticalForBusinessType } from '../partner-tags';

describe('verticalForBusinessType', () => {
  it('maps the values the live forms actually submit', () => {
    // /partners/mobile-bartenders hard-codes these two.
    expect(verticalForBusinessType('Mobile Bartender')).toBe('bartender');
    expect(verticalForBusinessType('Mobile Bartenders')).toBe('bartender');
    // /partners/vacation-rentals.
    expect(verticalForBusinessType('Vacation Rental')).toBe('str');
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

  it('does NOT force hotels or apartments into the STR vertical', () => {
    // The str prospect DB is vacation-rental companies. A hotel is not one,
    // and /partners/property-management sells to multifamily apartments —
    // tagging either 'str' would file them in the wrong prospect view and
    // mirror that mistake to the CRM.
    expect(verticalForBusinessType('hotel')).toBeNull();
    expect(verticalForBusinessType('Hotels & Resorts')).toBeNull();
    expect(verticalForBusinessType('property')).toBeNull();
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

describe('isB2bBusinessType', () => {
  it('accepts businesses that map to no prospect vertical', () => {
    // Real partners, just not one of the three outbound verticals.
    expect(isB2bBusinessType('hotel')).toBe(true);
    expect(isB2bBusinessType('Hotels & Resorts')).toBe(true);
    expect(isB2bBusinessType('property')).toBe(true);
    expect(isB2bBusinessType('Corporate Offices')).toBe(true);
    expect(isB2bBusinessType('restaurant')).toBe(true);
  });

  it('accepts every vertical', () => {
    expect(isB2bBusinessType('Mobile Bartender')).toBe(true);
    expect(isB2bBusinessType('Vacation Rental')).toBe(true);
    expect(isB2bBusinessType('Event Space')).toBe(true);
  });

  it('rejects consumer forms that share the partner endpoint', () => {
    // /corporate/holiday-party is a customer booking a party — it posts to
    // /api/partners/inquiry, so without this it would land on the B2B board.
    expect(isB2bBusinessType('Corporate Holiday Party')).toBe(false);
    expect(isB2bBusinessType('wedding-dj')).toBe(false);
    expect(isB2bBusinessType(null)).toBe(false);
    expect(isB2bBusinessType('')).toBe(false);
  });

  it('leaves anything unrecognized on the consumer side', () => {
    // Pre-existing behavior for every PARTNER_INQUIRY lead; only a positive
    // match moves one to the partner board.
    expect(isB2bBusinessType('something else entirely')).toBe(false);
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
