/**
 * Regression: the operator alert must not repeat itself every 15 minutes.
 *
 * The 2026-08-18 sheet-permission outage sent one identical "needs attention"
 * email per tick — 96/day — until the feature was killed by hand. Identical
 * content inside the cooldown is now dropped; anything NEW still sends.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmailMock = vi.fn();
const findManyMock = vi.fn();

vi.mock('@/lib/email/resend-client', () => ({
  sendEmail: (...a: unknown[]) => sendEmailMock(...a),
  formatCurrency: (n: number) => `$${n.toFixed(2)}`,
}));
vi.mock('@/lib/database/client', () => ({
  prisma: { emailLog: { findMany: (...a: unknown[]) => findManyMock(...a) } },
}));

import { sendOpsAttentionAlert } from '@/lib/premiere-credits/notify';

const SHEET_403 = [{ sheetRow: 0, error: 'The caller does not have permission' }];

/** The metadata row EmailLog would hold for a previously-sent alert. */
function priorAlert(fingerprint: string) {
  return { metadata: { kind: 'ops-alert', fingerprint } };
}

/** Pull the fingerprint the implementation just used. */
function sentFingerprint(): string {
  const call = sendEmailMock.mock.calls.at(-1)?.[0] as { metadata: { fingerprint: string } };
  return call.metadata.fingerprint;
}

beforeEach(() => {
  sendEmailMock.mockReset();
  findManyMock.mockReset();
  sendEmailMock.mockResolvedValue('resend-id');
  findManyMock.mockResolvedValue([]);
});

describe('sendOpsAttentionAlert dedupe', () => {
  it('sends when nothing comparable was sent recently', async () => {
    await sendOpsAttentionAlert([], SHEET_403);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('suppresses an identical alert inside the cooldown', async () => {
    await sendOpsAttentionAlert([], SHEET_403);
    const fp = sentFingerprint();
    sendEmailMock.mockClear();

    findManyMock.mockResolvedValue([priorAlert(fp)]);
    await sendOpsAttentionAlert([], SHEET_403);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('still sends when the problem changes, even inside the cooldown', async () => {
    await sendOpsAttentionAlert([], SHEET_403);
    const fp = sentFingerprint();
    sendEmailMock.mockClear();

    findManyMock.mockResolvedValue([priorAlert(fp)]);
    await sendOpsAttentionAlert(
      [{ clientName: 'New Person', amount: 400, status: 'HELD_FOR_APPROVAL', reason: 'over-threshold' }],
      SHEET_403,
    );

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('includes the re-share remediation for a whole-sheet failure', async () => {
    await sendOpsAttentionAlert([], SHEET_403);
    const html = (sendEmailMock.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('The whole sheet read failed');
    expect(html).toContain('Viewer');
  });

  it('omits the remediation when only individual rows failed', async () => {
    await sendOpsAttentionAlert([], [{ sheetRow: 14, error: 'unparseable amount' }]);
    const html = (sendEmailMock.mock.calls[0][0] as { html: string }).html;
    expect(html).not.toContain('The whole sheet read failed');
  });

  it('fails open — a dedupe lookup error still sends the alert', async () => {
    findManyMock.mockRejectedValue(new Error('db down'));
    await sendOpsAttentionAlert([], SHEET_403);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('no-ops when there is nothing to report', async () => {
    await sendOpsAttentionAlert([], []);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
