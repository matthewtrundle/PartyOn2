/**
 * Inbound-email ingestion board-attach guard: idempotency (dedupe by Gmail
 * message id + P2002 race), PARTIAL→SUBMITTED promotion, no downgrade / no
 * reopen of closed cards (mirrors dashboard-lead — inbound email never sets
 * trustedSubmit, so it structurally can't reopen WON/LOST), forward-only
 * recency, and never-throws on board bookkeeping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import type { ParsedInbound } from '../inbound-email-parse';

const upsertLead = vi.fn();
const markLeadStatus = vi.fn();
const enrollLeadIfEligible = vi.fn();
const findUnique = vi.fn();
const create = vi.fn();
const leadUpdate = vi.fn();

vi.mock('../leadCapture', () => ({
  upsertLead: (...a: unknown[]) => upsertLead(...a),
  markLeadStatus: (...a: unknown[]) => markLeadStatus(...a),
}));
vi.mock('../pipeline', () => ({
  enrollLeadIfEligible: (...a: unknown[]) => enrollLeadIfEligible(...a),
}));
vi.mock('@/lib/email/gmail-client', () => ({
  inboundMailbox: () => 'info@partyondelivery.com',
  safeErrorMessage: (e: unknown) => String(e),
  isGmailInboundConfigured: () => true,
  getGmailClient: () => null,
}));
vi.mock('@/lib/database/client', () => ({
  prisma: {
    inboundEmail: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      create: (...a: unknown[]) => create(...a),
    },
    lead: { update: (...a: unknown[]) => leadUpdate(...a) },
  },
}));

import { ingestInboundEmail } from '../inbound-email';

function parsed(over: Partial<ParsedInbound> = {}): ParsedInbound {
  return {
    gmailMessageId: 'm1',
    gmailThreadId: 't1',
    fromEmail: 'jane@example.com',
    fromName: 'Jane Doe',
    toAddress: 'info@partyondelivery.com',
    subject: 'Boat party',
    snippet: 'hi',
    bodyText: 'hello',
    receivedAt: new Date('2026-07-14T12:00:00Z'),
    headers: {},
    ...over,
  };
}

function stubLead(over: Record<string, unknown> = {}) {
  return { id: 'lead-1', status: 'PARTIAL', sourceWidget: null, metadata: null, lastActivityAt: null, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue(null);
  upsertLead.mockResolvedValue(stubLead());
  create.mockResolvedValue({});
  leadUpdate.mockResolvedValue({});
  markLeadStatus.mockResolvedValue(undefined);
  enrollLeadIfEligible.mockResolvedValue(true);
});

describe('ingestInboundEmail', () => {
  it('new message → stamps INBOUND_EMAIL source, stores it, promotes PARTIAL to a card', async () => {
    const res = await ingestInboundEmail(parsed());
    expect(upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }),
      expect.objectContaining({ sourceWidget: 'INBOUND_EMAIL' }),
    );
    expect(create).toHaveBeenCalled();
    expect(markLeadStatus).toHaveBeenCalledWith('lead-1', 'SUBMITTED');
    expect(enrollLeadIfEligible).not.toHaveBeenCalled();
    expect(res).toEqual({ created: true, leadId: 'lead-1' });
  });

  it('already-seen Gmail id → no-op (no upsert, no store)', async () => {
    findUnique.mockResolvedValue({ leadId: 'lead-9' });
    const res = await ingestInboundEmail(parsed());
    expect(res).toEqual({ created: false, leadId: 'lead-9' });
    expect(upsertLead).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('a converted/closed lead is never downgraded or reopened — enroll only', async () => {
    upsertLead.mockResolvedValue(stubLead({ status: 'CONVERTED', sourceWidget: 'CONTACT_FORM' }));
    await ingestInboundEmail(parsed());
    expect(markLeadStatus).not.toHaveBeenCalled(); // no downgrade
    expect(enrollLeadIfEligible).toHaveBeenCalledWith('lead-1'); // no-ops on a staged lead
  });

  it('loses a create race (P2002) without double-attaching to the board', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }),
    );
    const res = await ingestInboundEmail(parsed());
    expect(res.created).toBe(false);
    expect(leadUpdate).not.toHaveBeenCalled(); // attachToBoard skipped — no double-bump
    expect(markLeadStatus).not.toHaveBeenCalled();
  });

  it('never throws when board bookkeeping fails (the message is already stored)', async () => {
    leadUpdate.mockRejectedValue(new Error('db down'));
    await expect(ingestInboundEmail(parsed())).resolves.toEqual({ created: true, leadId: 'lead-1' });
  });

  it('bumps recency forward only — never moves lastActivityAt backwards', async () => {
    upsertLead.mockResolvedValue(stubLead({ lastActivityAt: new Date('2026-07-20T00:00:00Z') }));
    await ingestInboundEmail(parsed());
    const stale = (leadUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect('lastActivityAt' in stale).toBe(false);

    leadUpdate.mockClear();
    upsertLead.mockResolvedValue(stubLead({ lastActivityAt: new Date('2026-07-01T00:00:00Z') }));
    await ingestInboundEmail(parsed());
    const fresh = (leadUpdate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(fresh.lastActivityAt).toEqual(new Date('2026-07-14T12:00:00Z'));
  });
});
