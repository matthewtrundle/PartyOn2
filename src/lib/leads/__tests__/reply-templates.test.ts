import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyTemplate,
  fillFirstName,
  greetingFor,
  inboundReplySubject,
  orderTemplatesForLead,
  quoteInboundMessage,
  unfilledTokens,
  type ReplyTemplate,
} from '../reply-templates';
import { REPLY_TEMPLATES } from '../reply-templates.generated';
import { buildModule } from '../../../../scripts/playbook/build-reply-templates';

describe('reply-templates helpers', () => {
  it('fills first name with a "there" fallback', () => {
    expect(fillFirstName('Hi {{first_name}},', 'Sarah')).toBe('Hi Sarah,');
    expect(fillFirstName('Hi {{first_name}},', '')).toBe('Hi there,');
    expect(fillFirstName('Hi {{first_name}},', null)).toBe('Hi there,');
    expect(fillFirstName('Hi {{first_name}}, {{first_name}}!', 'Jo')).toBe('Hi Jo, Jo!');
  });

  it('applyTemplate fills first name but leaves other tokens for the operator', () => {
    const tpl: ReplyTemplate = {
      id: 't',
      label: 'T',
      subject: 'For {{first_name}}',
      body: 'Hi {{first_name}}, cart: {{cart_url}}',
      tokens: ['first_name', 'cart_url'],
    };
    const { subject, body } = applyTemplate(tpl, { firstName: 'Mia' });
    expect(subject).toBe('For Mia');
    expect(body).toBe('Hi Mia, cart: {{cart_url}}');
  });

  it('greetingFor gives a "Hi {name}," head-start', () => {
    expect(greetingFor('Sam')).toBe('Hi Sam,\n\n');
    expect(greetingFor(null)).toBe('Hi there,\n\n');
  });

  it('inboundReplySubject dedupes Re: and handles empty', () => {
    expect(inboundReplySubject('Quote for Saturday')).toBe('Re: Quote for Saturday');
    expect(inboundReplySubject('Re: Quote')).toBe('Re: Quote');
    expect(inboundReplySubject('RE: Quote')).toBe('RE: Quote');
    expect(inboundReplySubject('')).toBe('Re: your message');
    expect(inboundReplySubject(null)).toBe('Re: your message');
  });

  it('quoteInboundMessage prefixes lines and names the sender', () => {
    const q = quoteInboundMessage({
      fromName: 'Dana',
      fromEmail: 'dana@x.com',
      receivedAt: '2026-07-16T15:00:00.000Z',
      bodyText: 'Line one\nLine two',
      snippet: null,
    });
    expect(q).toContain('Dana wrote:');
    expect(q).toContain('> Line one');
    expect(q).toContain('> Line two');
  });

  it('quoteInboundMessage trims a very long body so reply + quote stays under the limit', () => {
    const q = quoteInboundMessage({
      fromName: 'Pat',
      fromEmail: 'pat@x.com',
      receivedAt: '2026-07-16T15:00:00.000Z',
      bodyText: 'x'.repeat(9000),
      snippet: null,
    });
    expect(q).toContain('…[trimmed]');
    expect(q.length).toBeLessThan(4200);
  });

  it('quoteInboundMessage falls back to snippet, then a generic "they"', () => {
    const q = quoteInboundMessage({
      fromName: null,
      fromEmail: null,
      receivedAt: '2026-07-16T15:00:00.000Z',
      bodyText: null,
      snippet: 'hi there',
    });
    expect(q).toContain('they wrote:');
    expect(q).toContain('> hi there');
  });

  it('unfilledTokens finds remaining placeholders, deduped', () => {
    expect(unfilledTokens('Hi Sarah, cart {{cart_url}} and {{cart_url}}')).toEqual(['cart_url']);
    expect(unfilledTokens('all filled in')).toEqual([]);
    expect(unfilledTokens('{{first_name}} {{order_number}}')).toEqual([
      'first_name',
      'order_number',
    ]);
  });

  it('orderTemplatesForLead surfaces the best match first without dropping any', () => {
    const partner = orderTemplatesForLead(REPLY_TEMPLATES, { sourceWidget: 'PARTNER_INQUIRY' });
    expect(partner[0].id).toBe('partner-affiliate-inquiry');
    expect(partner).toHaveLength(REPLY_TEMPLATES.length);

    const corporate = orderTemplatesForLead(REPLY_TEMPLATES, { occasion: 'corporate-party' });
    expect(corporate[0].id).toBe('corporate-event-inquiry');

    const callback = orderTemplatesForLead(REPLY_TEMPLATES, { sourceWidget: 'CALL_BOOKING' });
    expect(callback[0].id).toBe('callback-request');

    const fallback = orderTemplatesForLead(REPLY_TEMPLATES, { sourceWidget: 'QUICK_BUY' });
    expect(fallback[0].id).toBe('quote-request');
  });
});

describe('reply-templates.generated', () => {
  it('has all 8 lead-relevant templates with the sign-off stripped', () => {
    expect(REPLY_TEMPLATES).toHaveLength(8);
    expect(REPLY_TEMPLATES.map((t) => t.id)).toContain('quote-request');
    for (const t of REPLY_TEMPLATES) {
      expect(t.body.length).toBeGreaterThan(0);
      expect(t.tokens).toContain('first_name');
      // the signature is added by buildLeadReplyEmail — never baked into a body.
      expect(t.body.endsWith('Party On Delivery')).toBe(false);
      expect(t.body.trimEnd().endsWith('Allan')).toBe(false);
    }
    expect(REPLY_TEMPLATES.find((t) => t.id === 'quote-request')?.tokens).toContain('cart_url');
  });

  it('is not stale — regenerating from the playbook is a no-op', () => {
    const committed = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/leads/reply-templates.generated.ts'),
      'utf8',
    );
    expect(committed).toBe(buildModule());
  });
});
