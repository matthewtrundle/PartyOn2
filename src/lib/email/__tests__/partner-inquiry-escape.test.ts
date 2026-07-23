import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock('../resend-client', () => ({ sendEmail: sendEmailMock }));

import { sendPartnerInquiryNotification, type PartnerInquiryData } from '../email-service';

beforeEach(() => {
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue('email-id');
});

describe('sendPartnerInquiryNotification — HTML escaping (CWE-79)', () => {
  it('escapes lead-supplied fields in the ops notification email', async () => {
    const data: PartnerInquiryData = {
      contactName: '<script>alert(1)</script>',
      email: 'attacker@evil.test',
      message: '<img src=x onerror=alert(2)>',
      partnerType: '"><b>pwn</b>',
      submittedAt: '2026-07-22T00:00:00.000Z',
    };
    await sendPartnerInquiryNotification(data);

    expect(sendEmailMock).toHaveBeenCalledOnce();
    const { html } = sendEmailMock.mock.calls[0][0] as { html: string };

    // No raw lead-supplied markup survives into the HTML body.
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
    expect(html).not.toContain('"><b>pwn</b>');

    // The escaped forms are present instead.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
  });
});
