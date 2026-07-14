/**
 * recordEvent trust-marker hardening (security review HIGH-1): a client-supplied
 * `trustedSubmit` key inside `metadata` must never survive to the stored
 * LeadEvent — only a server-set `trustedSubmit: true` flag may stamp it.
 * Otherwise the public pixel route (which passes caller metadata verbatim)
 * could forge the marker and make sweepReopens reopen any closed card.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const events: Array<Record<string, unknown>> = [];
const prismaMock = vi.hoisted(() => ({
  leadEvent: { create: vi.fn() },
  lead: { update: vi.fn() },
}));
vi.mock('@/lib/database/client', () => ({ prisma: prismaMock }));

const pipelineMock = vi.hoisted(() => ({
  handleSubmitSignal: vi.fn(),
  enrollLeadIfEligible: vi.fn(),
}));
vi.mock('../pipeline', () => pipelineMock);

import { recordEvent } from '../leadCapture';

beforeEach(() => {
  events.length = 0;
  vi.clearAllMocks();
  prismaMock.leadEvent.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    events.push(data);
    return data;
  });
  prismaMock.lead.update.mockResolvedValue({});
});

describe('recordEvent — trustedSubmit forgery guard', () => {
  it('strips a client-forged trustedSubmit from an untrusted event', async () => {
    await recordEvent({
      type: 'FORM_SUBMIT',
      leadId: 'lead-1',
      metadata: { trustedSubmit: true, foo: 'bar' },
      // no trustedSubmit flag → this is the public-pixel path
    });
    const stored = events[0].metadata as Record<string, unknown> | null;
    expect(stored).toEqual({ foo: 'bar' }); // forged key gone, real keys kept
    expect(pipelineMock.handleSubmitSignal).not.toHaveBeenCalled();
  });

  it('stores null metadata when the only key was a forged trustedSubmit', async () => {
    await recordEvent({ type: 'FORM_SUBMIT', leadId: 'lead-1', metadata: { trustedSubmit: true } });
    expect(events[0].metadata).toBeNull();
    expect(pipelineMock.handleSubmitSignal).not.toHaveBeenCalled();
  });

  it('stamps trustedSubmit only when the server sets the flag (and reopens)', async () => {
    await recordEvent({
      type: 'FORM_SUBMIT',
      leadId: 'lead-1',
      trustedSubmit: true,
      metadata: { flow: 'contact' },
    });
    expect(events[0].metadata).toEqual({ flow: 'contact', trustedSubmit: true });
    expect(pipelineMock.handleSubmitSignal).toHaveBeenCalledWith('lead-1');
  });

  it('a forged trustedSubmit cannot ride a non-submit event type', async () => {
    await recordEvent({
      type: 'PAGE_VIEW',
      leadId: 'lead-1',
      trustedSubmit: true, // ignored: PAGE_VIEW is not a submit type
      metadata: { trustedSubmit: true },
    });
    expect(events[0].metadata).toBeNull();
    expect(pipelineMock.handleSubmitSignal).not.toHaveBeenCalled();
  });
});
