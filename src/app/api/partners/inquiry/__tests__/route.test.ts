/**
 * Tests for POST /api/partners/inquiry — the shared partner lead-capture
 * endpoint behind the corporate, mobile-bartender, vacation-rental,
 * hotels-resort, austin-partners and wedding-DJ forms.
 *
 * The load-bearing guarantee mirrors the event RSVP route: a lead is only ever
 * told "we got it" (and only fires a Meta Lead event) when a row was actually
 * persisted — the response carries an `inquiryId`. A honeypot trip must drop
 * silently WITHOUT an `inquiryId` and write nothing; a failed DB save must also
 * return without an `inquiryId` (which is why every form now gates its success
 * state on it).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { HONEYPOT_FIELD } from '@/lib/forms/honeypot';

const dbMock = vi.hoisted(() => ({ savePartnerInquiry: vi.fn() }));
vi.mock('@/lib/group-orders/database-vercel', () => ({ db: dbMock }));

const emailMock = vi.hoisted(() => ({
  sendPartnerInquiryNotification: vi.fn(),
  sendPartnerOnePagerEmail: vi.fn(),
}));
vi.mock('@/lib/email/email-service', () => emailMock);

vi.mock('@/lib/email/resend-audiences', () => ({ addContactToAudience: vi.fn() }));

const prismaMock = vi.hoisted(() => ({
  partnerInquiry: { findFirst: vi.fn(), update: vi.fn() },
  lead: { update: vi.fn() },
}));
vi.mock('@/lib/database/client', () => ({
  kv: {},
  isKVConfigured: () => false,
  prisma: prismaMock,
}));

const leadCaptureMock = vi.hoisted(() => ({
  upsertLead: vi.fn(),
  markLeadStatus: vi.fn(),
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const pipelineMock = vi.hoisted(() => ({ enrollLeadIfEligible: vi.fn() }));
vi.mock('@/lib/leads/pipeline', () => pipelineMock);

import { POST } from '../route';

let ipCounter = 0;

/** Build a POST request with a fresh per-test IP so the in-memory rate limiter never bleeds across cases. */
function makeRequest(body: unknown): NextRequest {
  ipCounter += 1;
  return new NextRequest('http://localhost/api/partners/inquiry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.1.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  contactName: 'Jane Smith',
  email: 'jane@example.com',
  businessName: 'Smith Events',
  phone: '512-555-1234',
  partnerType: 'Corporate Events',
  source: 'corporate-landing-page',
};

beforeEach(() => {
  dbMock.savePartnerInquiry.mockReset();
  emailMock.sendPartnerInquiryNotification.mockReset();
  emailMock.sendPartnerOnePagerEmail.mockReset();
  prismaMock.partnerInquiry.findFirst.mockReset();
  prismaMock.partnerInquiry.update.mockReset();
  prismaMock.lead.update.mockReset();
  leadCaptureMock.upsertLead.mockReset();
  leadCaptureMock.markLeadStatus.mockReset();
  pipelineMock.enrollLeadIfEligible.mockReset();
  leadCaptureMock.upsertLead.mockResolvedValue({
    id: 'lead-1',
    status: 'PARTIAL',
    metadata: null,
  });
});

describe('POST /api/partners/inquiry', () => {
  it('persists a valid inquiry and returns success + inquiryId', async () => {
    dbMock.savePartnerInquiry.mockResolvedValue({ id: 'inq_123' });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.inquiryId).toBe('inq_123');
    expect(dbMock.savePartnerInquiry).toHaveBeenCalledTimes(1);
    expect(dbMock.savePartnerInquiry).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', contactName: 'Jane Smith' }),
    );
  });

  it('drops a honeypot submission WITHOUT an inquiryId and never writes', async () => {
    const res = await POST(makeRequest({ ...validBody, [HONEYPOT_FIELD]: 'http://spam.example' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // success:true keeps bots in the dark, but no inquiryId means the form
    // won't show a "thank you" — what protects a real autofilled visitor.
    expect(json.success).toBe(true);
    expect(json.inquiryId).toBeUndefined();
    expect(dbMock.savePartnerInquiry).not.toHaveBeenCalled();
  });

  it('still drops the legacy honeypot names (zero rollout gap)', async () => {
    const resUrl = await POST(makeRequest({ ...validBody, website_url: 'x' }));
    expect((await resUrl.json()).inquiryId).toBeUndefined();

    const resFax = await POST(makeRequest({ ...validBody, fax_number: '555' }));
    expect((await resFax.json()).inquiryId).toBeUndefined();

    expect(dbMock.savePartnerInquiry).not.toHaveBeenCalled();
  });

  it('ignores an empty honeypot and still saves', async () => {
    dbMock.savePartnerInquiry.mockResolvedValue({ id: 'inq_456' });

    const res = await POST(makeRequest({ ...validBody, [HONEYPOT_FIELD]: '' }));
    const json = await res.json();

    expect(json.inquiryId).toBe('inq_456');
    expect(dbMock.savePartnerInquiry).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing email with 400 and does not write', async () => {
    const res = await POST(makeRequest({ ...validBody, email: '' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(dbMock.savePartnerInquiry).not.toHaveBeenCalled();
  });

  it('returns success WITHOUT an inquiryId when the DB save fails (why forms gate on it)', async () => {
    dbMock.savePartnerInquiry.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.inquiryId).toBeUndefined();
  });

  it('mirrors a successful inquiry onto the Lead Flow board (PARTNER_INQUIRY, promoted)', async () => {
    dbMock.savePartnerInquiry.mockResolvedValue({ id: 'inq_123' });

    await POST(makeRequest(validBody));

    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', firstName: 'Jane' }),
      expect.objectContaining({ sourceWidget: 'PARTNER_INQUIRY' }),
    );
    expect(prismaMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            partnerInquiry: expect.objectContaining({ inquiryId: 'inq_123' }),
          }),
        }),
      }),
    );
    expect(leadCaptureMock.markLeadStatus).toHaveBeenCalledWith('lead-1', 'SUBMITTED');
  });

  it('never downgrades a CONVERTED lead — enroll only', async () => {
    dbMock.savePartnerInquiry.mockResolvedValue({ id: 'inq_124' });
    leadCaptureMock.upsertLead.mockResolvedValue({
      id: 'lead-2',
      status: 'CONVERTED',
      metadata: null,
    });

    await POST(makeRequest(validBody));

    expect(leadCaptureMock.markLeadStatus).not.toHaveBeenCalled();
    expect(pipelineMock.enrollLeadIfEligible).toHaveBeenCalledWith('lead-2');
  });

  it('writes NO lead when the honeypot trips or the save fails', async () => {
    await POST(makeRequest({ ...validBody, [HONEYPOT_FIELD]: 'http://spam.example' }));
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();

    dbMock.savePartnerInquiry.mockResolvedValue(null);
    await POST(makeRequest(validBody));
    expect(leadCaptureMock.upsertLead).not.toHaveBeenCalled();
  });
});
