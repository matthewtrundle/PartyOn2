/**
 * persistChatTurn provenance rule (security review 2026-09-06): a name parsed
 * from unauthenticated chat text may only populate a lead this conversation
 * CREATES. upsertLead fills blank fields on a matched row, so without this an
 * anonymous caller who knows a customer's phone could plant a name on that
 * customer's record ("5125550001--Some Name--x@y.com") and it would reach the
 * CRM's "Hi {firstName}" SMS. Linking by email/phone is unchanged.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const leadCaptureMock = vi.hoisted(() => ({
  upsertLead: vi.fn(),
  findLead: vi.fn(),
  recordEvent: vi.fn(),
}));
vi.mock('@/lib/leads/leadCapture', () => leadCaptureMock);

const prismaMock = vi.hoisted(() => ({
  chatConversation: { upsert: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/database/client', () => ({
  kv: {},
  isKVConfigured: () => false,
  prisma: prismaMock,
}));
vi.mock('@/lib/leads/pipeline', () => ({ enrollLeadIfEligible: vi.fn() }));
vi.mock('@/lib/leads/crm-mirror', () => ({
  mirrorLeadToCrm: vi.fn(),
  leadBoardUrl: (id: string) => `/admin/leads/${id}`,
}));
vi.mock('../escalation-alert', () => ({ sendChatEscalationEmail: vi.fn() }));

import { persistChatTurn } from '../capture';

const PASTE = '5125550001--Sam Rivers--sam@example.com';

function turn(): Promise<void> {
  return persistChatTurn({
    conversationId: 'c1',
    messages: [
      { role: 'user', content: PASTE },
      { role: 'assistant', content: 'Got it — what date is the party?' },
    ],
  });
}

describe('persistChatTurn — a chat-parsed name only populates a lead the chat creates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.chatConversation.upsert.mockResolvedValue({
      id: 'convo1',
      leadId: null,
      escalationNotifiedAt: null,
    });
    leadCaptureMock.upsertLead.mockResolvedValue({ id: 'lead1' });
  });

  it('passes the parsed name when no lead exists for that phone/email', async () => {
    leadCaptureMock.findLead.mockResolvedValue(null);
    await turn();
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledWith(
      { email: 'sam@example.com', phone: '5125550001', firstName: 'Sam', lastName: 'Rivers' },
      expect.objectContaining({ sourceWidget: 'WAYNE_CHAT' }),
    );
  });

  it('withholds the name when the phone/email already matches an existing lead', async () => {
    leadCaptureMock.findLead.mockResolvedValue({ id: 'victim', firstName: null, lastName: null });
    await turn();
    expect(leadCaptureMock.upsertLead).toHaveBeenCalledTimes(1);
    const identify = leadCaptureMock.upsertLead.mock.calls[0][0];
    expect(identify).toEqual({ email: 'sam@example.com', phone: '5125550001' });
    expect(identify).not.toHaveProperty('firstName');
    expect(identify).not.toHaveProperty('lastName');
  });
});
