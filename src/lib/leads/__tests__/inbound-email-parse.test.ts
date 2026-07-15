/**
 * Pure inbound-email parsing + noise filtering: address parsing, MIME body
 * extraction (plain / nested / html-fallback), message parsing, and the
 * "only likely inquiries" filter (self / automated / bulk / list / auto).
 */
import { describe, it, expect } from 'vitest';
import type { gmail_v1 } from 'googleapis';
import {
  extractBodyText,
  parseAddress,
  parseGmailMessage,
  shouldIngestInbound,
  type ParsedInbound,
} from '../inbound-email-parse';

const b64 = (s: string): string => Buffer.from(s).toString('base64url');

describe('parseAddress', () => {
  it('splits quoted name + angle-addr and lowercases the email', () => {
    expect(parseAddress('"Jane Doe" <Jane@Example.com>')).toEqual({
      email: 'jane@example.com',
      name: 'Jane Doe',
    });
  });
  it('handles bare name + angle-addr and bare address', () => {
    expect(parseAddress('Jane <jane@x.com>')).toEqual({ email: 'jane@x.com', name: 'Jane' });
    expect(parseAddress('jane@x.com')).toEqual({ email: 'jane@x.com', name: null });
  });
  it('rejects junk and null', () => {
    expect(parseAddress('not an address')).toEqual({ email: null, name: null });
    expect(parseAddress(null)).toEqual({ email: null, name: null });
  });
});

describe('extractBodyText', () => {
  it('prefers a text/plain part', () => {
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: b64('Hello there') } },
        { mimeType: 'text/html', body: { data: b64('<p>Hello there</p>') } },
      ],
    };
    expect(extractBodyText(payload)).toBe('Hello there');
  });
  it('falls back to stripped text/html when no plain part', () => {
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: 'text/html',
      body: { data: b64('<div>Hi <b>Jane</b>&amp;co</div>') },
    };
    expect(extractBodyText(payload)).toBe('Hi Jane &co');
  });
  it('reads a single-part plain body and returns null when empty', () => {
    expect(
      extractBodyText({ mimeType: 'text/plain', body: { data: b64('just text') } }),
    ).toBe('just text');
    expect(extractBodyText({ mimeType: 'text/plain', body: {} })).toBeNull();
  });
  it('caps very long bodies', () => {
    const big = 'x'.repeat(20_000);
    const out = extractBodyText({ mimeType: 'text/plain', body: { data: b64(big) } });
    expect(out?.length).toBe(16_000);
  });
});

function msg(headers: Array<[string, string]>, over: Partial<gmail_v1.Schema$Message> = {}): gmail_v1.Schema$Message {
  return {
    id: 'm1',
    threadId: 't1',
    snippet: 'a snippet',
    internalDate: String(Date.UTC(2026, 6, 14, 12)),
    payload: {
      headers: headers.map(([name, value]) => ({ name, value })),
      mimeType: 'text/plain',
      body: { data: b64('body here') },
    },
    ...over,
  };
}

describe('parseGmailMessage', () => {
  it('extracts the sender, subject, body, and received time', () => {
    const parsed = parseGmailMessage(
      msg([
        ['From', 'Jane Doe <jane@example.com>'],
        ['To', 'info@partyondelivery.com'],
        ['Subject', 'Boat party'],
      ]),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.fromEmail).toBe('jane@example.com');
    expect(parsed?.fromName).toBe('Jane Doe');
    expect(parsed?.subject).toBe('Boat party');
    expect(parsed?.bodyText).toBe('body here');
    expect(parsed?.receivedAt.getTime()).toBe(Date.UTC(2026, 6, 14, 12));
  });
  it('returns null when there is no parseable sender', () => {
    expect(parseGmailMessage(msg([['Subject', 'No from']]))).toBeNull();
    expect(parseGmailMessage({ threadId: 't' })).toBeNull(); // no id
  });
});

// --- shouldIngestInbound ---------------------------------------------------

function parsed(over: Partial<ParsedInbound>): ParsedInbound {
  return {
    gmailMessageId: 'm1',
    gmailThreadId: null,
    fromEmail: 'jane@example.com',
    fromName: 'Jane',
    toAddress: 'info@partyondelivery.com',
    subject: 'Hi',
    snippet: null,
    bodyText: null,
    receivedAt: new Date('2026-07-14T12:00:00Z'),
    headers: {},
    ...over,
  };
}

describe('shouldIngestInbound', () => {
  it('keeps a genuine person-to-person inquiry', () => {
    expect(shouldIngestInbound(parsed({}))).toEqual({ ingest: true });
  });

  it('skips our own outbound / internal mail', () => {
    expect(shouldIngestInbound(parsed({ fromEmail: 'allan@partyondelivery.com' })).reason).toBe('self');
  });

  it('skips automated / role-address senders by local-part', () => {
    for (const addr of [
      'no-reply@vendor.com',
      'noreply@vendor.com',
      'donotreply@vendor.com',
      'mailer-daemon@x.com',
      'notifications@app.com',
      'newsletter@brand.com',
      'support@acme.com',
      'help@acme.com',
      'billing@acme.com',
      'team@acme.com',
      'marketing@acme.com',
      'security@acme.com',
    ]) {
      expect(shouldIngestInbound(parsed({ fromEmail: addr })).reason).toBe('automated-sender');
    }
  });

  it('skips known vendor/SaaS domains (checked before local-part)', () => {
    // The exact sender that slipped through in production — automated LeadGenJay
    // mail from help@leadgenjay.com. Domain rule fires first.
    expect(shouldIngestInbound(parsed({ fromEmail: 'help@leadgenjay.com' })).reason).toBe('vendor-domain');
    expect(shouldIngestInbound(parsed({ fromEmail: 'jane@leadgenjay.com' })).reason).toBe('vendor-domain');
  });

  it('keeps real people whose local-part merely starts with an automated-ish token', () => {
    for (const addr of [
      'notifyjane@gmail.com',
      'updateme@gmail.com',
      'bouncer@x.com',
      'mailerman@x.com',
      'alerta@x.com',
      'helpful@gmail.com',
      'teamsters@gmail.com',
      'salesperson@gmail.com',
    ]) {
      expect(shouldIngestInbound(parsed({ fromEmail: addr }))).toEqual({ ingest: true });
    }
  });

  it('skips bulk/list mail by header', () => {
    expect(shouldIngestInbound(parsed({ headers: { 'list-unsubscribe': '<...>' } })).reason).toBe('bulk-list');
    expect(shouldIngestInbound(parsed({ headers: { 'list-id': 'x' } })).reason).toBe('bulk-list');
    expect(shouldIngestInbound(parsed({ headers: { precedence: 'bulk' } })).reason).toBe('bulk-precedence');
  });

  it('skips auto-generated mail but keeps auto-submitted:no', () => {
    expect(shouldIngestInbound(parsed({ headers: { 'auto-submitted': 'auto-replied' } })).reason).toBe(
      'auto-submitted',
    );
    expect(shouldIngestInbound(parsed({ headers: { 'auto-submitted': 'no' } }))).toEqual({ ingest: true });
  });
});
