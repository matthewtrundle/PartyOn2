/**
 * Enrollment gates: reason precedence and the verification matrix
 * (VALID sendable; CATCH_ALL needs the override; INVALID/ROLE blocked;
 * UNVERIFIED/UNKNOWN must verify first).
 */

import { describe, it, expect } from 'vitest';
import { enrollGateReason } from '../enroll-gate';

function prospect(overrides: Partial<Parameters<typeof enrollGateReason>[0]> = {}) {
  return {
    email: 'a@b.com',
    draftStatus: 'APPROVED',
    emailVerifyStatus: 'VALID',
    emailVerifyOverride: false,
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

  it('verification matrix', () => {
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'VALID' }), false)).toBeNull();
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'CATCH_ALL' }), false)).toBe(
      'email-catch-all-needs-override'
    );
    expect(
      enrollGateReason(
        prospect({ emailVerifyStatus: 'CATCH_ALL', emailVerifyOverride: true }),
        false
      )
    ).toBeNull();
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'INVALID' }), false)).toBe(
      'email-invalid'
    );
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'ROLE' }), false)).toBe('email-invalid');
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'UNVERIFIED' }), false)).toBe(
      'email-not-verified'
    );
    expect(enrollGateReason(prospect({ emailVerifyStatus: 'UNKNOWN' }), false)).toBe(
      'email-not-verified'
    );
  });
});
