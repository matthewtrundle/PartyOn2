/**
 * CoreLinq alert sanitizers: PII redaction + HTML escaping of the failure
 * detail that may embed CoreLinq's raw error body in the operator email.
 */

import { describe, it, expect, vi } from 'vitest';

// The module pulls in prisma + Resend for the alerting path; the pure
// sanitizers under test never touch them.
vi.mock('@/lib/database/client', () => ({ prisma: {} }));
vi.mock('@/lib/email/resend-client', () => ({ sendEmail: vi.fn() }));

import { escapeHtml, sanitizeAlertDetail } from '../corelinq-alert';

describe('escapeHtml', () => {
  it('escapes & before < so entities survive intact', () => {
    expect(escapeHtml('<b>&lt;</b>')).toBe('&lt;b>&amp;lt;&lt;/b>');
  });
});

describe('sanitizeAlertDetail', () => {
  it('redacts email addresses from the detail', () => {
    const out = sanitizeAlertDetail('HTTP 400: invalid field email="jane.doe+vip@gmail.com"');
    expect(out).not.toContain('jane.doe');
    expect(out).toContain('[email]');
  });

  it('redacts 10+-digit phone runs but leaves status codes and dates alone', () => {
    const out = sanitizeAlertDetail('HTTP 422 at 2026-07-13: phone +1 (512) 555-0187 rejected');
    expect(out).not.toContain('555-0187');
    expect(out).toContain('[phone]');
    expect(out).toContain('HTTP 422');
    expect(out).toContain('2026-07-13');
  });

  it('truncates to 300 chars and escapes HTML', () => {
    const out = sanitizeAlertDetail(`<script>${'x'.repeat(400)}`);
    expect(out.startsWith('&lt;script>')).toBe(true);
    // 300 input chars, then escaping may lengthen the string — but no raw '<'.
    expect(out).not.toContain('<');
  });
});
