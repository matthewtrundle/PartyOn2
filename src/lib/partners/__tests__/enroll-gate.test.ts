/**
 * Enrollment gates: reason precedence and the verification matrix.
 * VALID / CATCH_ALL / ROLE all sendable; INVALID blocked outright (guaranteed
 * hard bounce); UNVERIFIED/UNKNOWN must verify first.
 */

import { describe, it, expect } from 'vitest';
import { enrollGateReason } from '../enroll-gate';

function prospect(overrides: Partial<Parameters<typeof enrollGateReason>[0]> = {}) {
  return {
    email: 'a@b.com',
    draftStatus: 'APPROVED',
    emailVerifyStatus: 'VALID',
    ...overrides,
  };
}

describe('enrollGateReason', () => {
  it('passes a fully-gated prospect', () => {
    expect(enrollGateReason(prospect(), false)).toBeNull();
  });

  it('reason precedence: no-email → suppressed → draft-not-approved → verification', () => {
    expect(enrollGateReason(prospect({ email: null }), true)).toBe('no-email');
    expect(enrollGateReason(prospect(), true)).toBe('suppressed');
    expect(enrollGateReason(prospect({ draftStatus: 'DRAFTED' }), false)).toBe(
      'draft-not-approved'
    );
    expect(enrollGateReason(prospect({ draftStatus: 'NONE' }), false)).toBe('draft-not-approved');
  });

  it('verification matrix — anything the verifier could check, except INVALID, sends', () => {
    for (const status of ['VALID', 'CATCH_ALL', 'ROLE'] as const) {
      expect(enrollGateReason(prospect({ emailVerifyStatus: status }), false)).toBeNull();
    }
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'INVALID' }), false)).toBe(
      'email-invalid'
    );
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'UNVERIFIED' }), false)).toBe(
      'email-not-verified'
    );
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'UNKNOWN' }), false)).toBe(
      'email-not-verified'
    );
  });

  it('verification still gates sending — an unverified address is never enrollable', () => {
    // The per-prospect override is gone, but ZeroBounce is not optional: an
    // address nobody checked must not send just because a draft is approved.
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'UNVERIFIED' }), false)).not.toBeNull();
  });

  it('suppression and approval still outrank a sendable role address', () => {
    const role = { emailVerifyStatus: 'ROLE' } as const;
    expect(enrollGateReason(prospect(role), true)).toBe('suppressed');
    expect(enrollGateReason(prospect({ ...role, draftStatus: 'DRAFTED' }), false)).toBe(
      'draft-not-approved'
    );
  });
});
