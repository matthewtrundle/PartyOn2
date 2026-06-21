/**
 * Tests for the shared honeypot helper.
 *
 * The load-bearing guarantee: the canonical honeypot field name must NEVER
 * match a browser/password-manager autofill heuristic, or iOS Safari / Chrome
 * autofill fills the hidden trap for a real visitor and the server drops them
 * as a bot (the PR #148 failure). The "no autofill token" test below is the
 * regression guard that was missing when this class of bug shipped.
 */

import { describe, it, expect } from 'vitest';
import {
  HONEYPOT_FIELD,
  LEGACY_HONEYPOT_FIELDS,
  ALL_HONEYPOT_FIELDS,
  isHoneypotTripped,
  blankHoneypotFields,
} from '../honeypot';

// Tokens browsers / password managers map to autofill. The canonical trap name
// must contain none of these as a substring.
const AUTOFILL_TOKENS = [
  'company',
  'organization',
  'website',
  'url',
  'email',
  'name',
  'phone',
  'tel',
  'address',
  'fax',
  'username',
  'firstname',
  'lastname',
];

describe('HONEYPOT_FIELD', () => {
  it('carries no browser-autofill token (the missing regression guard)', () => {
    const lower = HONEYPOT_FIELD.toLowerCase();
    for (const token of AUTOFILL_TOKENS) {
      expect(lower.includes(token), `honeypot name must not contain "${token}"`).toBe(false);
    }
  });

  it('is included in the server-side trip list alongside the legacy names', () => {
    expect(ALL_HONEYPOT_FIELDS).toContain(HONEYPOT_FIELD);
    for (const legacy of LEGACY_HONEYPOT_FIELDS) {
      expect(ALL_HONEYPOT_FIELDS).toContain(legacy);
    }
  });
});

describe('isHoneypotTripped', () => {
  it('trips on the canonical field and reports which one fired', () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: 'http://spam.example' })).toEqual({
      tripped: true,
      field: HONEYPOT_FIELD,
    });
  });

  it('still trips on legacy field names (zero rollout gap for old clients)', () => {
    expect(isHoneypotTripped({ website_url: 'x' }).tripped).toBe(true);
    expect(isHoneypotTripped({ fax_number: '555' }).tripped).toBe(true);
  });

  it('does NOT trip on empty / whitespace-only values', () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: '' }).tripped).toBe(false);
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: '   ' }).tripped).toBe(false);
  });

  it('does NOT trip on real, legitimately-filled fields', () => {
    // The exact failure mode we are guarding against: a real visitor's company
    // name / website / email must never be treated as a honeypot.
    expect(
      isHoneypotTripped({
        company: 'Acme Corp',
        website: 'https://acme.example',
        email: 'jane@acme.example',
        name: 'Jane Smith',
      }).tripped,
    ).toBe(false);
  });

  it('is safe on null / undefined / non-object bodies', () => {
    expect(isHoneypotTripped(null).tripped).toBe(false);
    expect(isHoneypotTripped(undefined).tripped).toBe(false);
  });

  it('ignores non-string honeypot values (a numeric real field cannot trip it)', () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: 0 as unknown as string }).tripped).toBe(false);
  });
});

describe('blankHoneypotFields', () => {
  it('returns an empty value under the canonical field name', () => {
    expect(blankHoneypotFields()).toEqual({ [HONEYPOT_FIELD]: '' });
  });
});
