/**
 * Workbench derivations: chip precedence (SUPPRESSED > REPLIED > SENT >
 * ENROLLED > APPROVED > VERIFIED > DRAFTED > ENRICHED > SOURCED), the
 * FAILED overlay, enroll-disable reasons, and the bounded-concurrency
 * queue behind bulk verify.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveStatus,
  drainQueue,
  enrollDisableReason,
  hasFailure,
  isEmailVerified,
  type LeadState,
  type ProspectRow,
} from '../types';

function row(overrides: Partial<ProspectRow> = {}): ProspectRow {
  return {
    id: 'p1',
    vertical: 'str',
    city: 'Austin',
    name: 'A',
    website: 'https://a.com',
    websiteKey: 'a.com',
    propertiesEstimate: '',
    contactName: null,
    email: 'a@a.com',
    phone: null,
    socials: {},
    logoUrl: null,
    description: '',
    partnerSlug: null,
    leadId: null,
    source: 'seed-str',
    researchStatus: 'PENDING',
    researchError: null,
    enrichment: null,
    draftStatus: 'NONE',
    draftSubject: null,
    draftAltSubject: null,
    draftBody: null,
    draftFollowUpBody: null,
    draftTouch3Body: null,
    draftHook: null,
    draftError: null,
    draftRedoGuidance: null,
    draftBSubject: null,
    draftBBody: null,
    draftBSource: null,
    abArm: null,
    experimentKey: null,
    emailVerifyStatus: 'UNVERIFIED',
    emailVerifyOverride: false,
    emailVerifiedAt: null,
    ...overrides,
  };
}

const state = (overrides: Partial<LeadState> = {}): LeadState => ({
  leadId: 'l1',
  tags: [],
  campaign: 'none',
  ...overrides,
});

describe('deriveStatus precedence', () => {
  it('walks the full precedence chain', () => {
    const full = row({
      researchStatus: 'ENRICHED',
      draftStatus: 'APPROVED',
      emailVerifyStatus: 'VALID',
      enrichment: {},
    });
    expect(deriveStatus(full, state({ suppressed: true, campaign: 'replied' }))).toBe('SUPPRESSED');
    expect(deriveStatus(full, state({ campaign: 'replied' }))).toBe('REPLIED');
    expect(deriveStatus(full, state({ campaign: 'sent' }))).toBe('SENT');
    expect(deriveStatus(full, state({ campaign: 'enrolled' }))).toBe('ENROLLED');
    expect(deriveStatus(full, state())).toBe('APPROVED');
    expect(deriveStatus({ ...full, draftStatus: 'NONE' }, state())).toBe('VERIFIED');
    expect(
      deriveStatus({ ...full, draftStatus: 'DRAFTED', emailVerifyStatus: 'UNVERIFIED' }, state())
    ).toBe('DRAFTED');
    expect(
      deriveStatus({ ...full, draftStatus: 'NONE', emailVerifyStatus: 'UNVERIFIED' }, state())
    ).toBe('ENRICHED');
    expect(deriveStatus(row(), state())).toBe('SOURCED');
  });

  it('catch-all counts as verified only with the operator override', () => {
    expect(isEmailVerified(row({ emailVerifyStatus: 'CATCH_ALL' }))).toBe(false);
    expect(
      isEmailVerified(row({ emailVerifyStatus: 'CATCH_ALL', emailVerifyOverride: true }))
    ).toBe(true);
  });

  it('role addresses count as verified only with the operator override', () => {
    expect(isEmailVerified(row({ emailVerifyStatus: 'ROLE' }))).toBe(false);
    expect(isEmailVerified(row({ emailVerifyStatus: 'ROLE', emailVerifyOverride: true }))).toBe(
      true
    );
    // Mirrors the server gate: the override is meaningless on a rejected status.
    expect(isEmailVerified(row({ emailVerifyStatus: 'INVALID', emailVerifyOverride: true }))).toBe(
      false
    );
  });

  it('flags failures as an overlay, not a status', () => {
    expect(hasFailure(row({ researchStatus: 'FAILED' }))).toBe(true);
    expect(hasFailure(row({ draftStatus: 'FAILED' }))).toBe(true);
    expect(hasFailure(row())).toBe(false);
  });
});

describe('enrollDisableReason', () => {
  it('orders reasons: no email → suppressed → unsynced → already in campaign', () => {
    expect(enrollDisableReason(row({ email: null }), state())).toContain('No email');
    expect(enrollDisableReason(row(), state({ suppressed: true }))).toContain('Suppressed');
    expect(enrollDisableReason(row(), undefined)).toContain('Sync');
    expect(enrollDisableReason(row(), state({ campaign: 'sent' }))).toContain('Already sent');
    expect(enrollDisableReason(row(), state())).toBeNull();
  });
});

describe('drainQueue', () => {
  it('processes everything with at most N in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const seen: number[] = [];
    const done = await drainQueue(
      Array.from({ length: 10 }, (_, i) => i),
      async (i) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        seen.push(i);
        inFlight--;
      },
      3
    );
    expect(done).toBe(10);
    expect(seen).toHaveLength(10);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
