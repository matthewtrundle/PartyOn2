/**
 * Event abandoned-cart email — escaping + CAN-SPAM regression tests.
 *
 * This template renders from `Lead.metadata.abandonedCart`, written by an
 * UNAUTHENTICATED endpoint. Before this was fixed, `resumeUrl` went straight
 * into the CTA href with no escaping while every other field was escaped — so
 * a quote in the value broke out of the attribute, and the link itself could
 * point anywhere. The writer and the cron now derive both the link and the
 * title from our own event registry; these tests hold the last line of defense
 * at the sink.
 */

import { describe, it, expect } from 'vitest';
import { eventAbandonedCartEmail } from '../event-abandoned-cart';
import { POSTAL_ADDRESS } from '@/lib/followups/copy';

const base = {
  firstName: 'Sam',
  eventTitle: "Brian's 41st Birthday Bash",
  eventDateLine: 'Mon, Mar 15 · 7:00 PM',
  eventVenue: 'The Hill House',
  eventAddress: '2002 East 7th Street, Austin, TX 78702',
  resumeUrl: 'https://partyondelivery.com/events/brian-41st-birthday',
  unsubscribeUrl: 'https://partyondelivery.com/email/preferences?email=a%40b.com&token=abc',
  itemCount: 3,
  cartTotal: 128.5,
};

describe('eventAbandonedCartEmail — href escaping', () => {
  it('escapes a quote in resumeUrl so it cannot break out of the attribute', () => {
    const { html } = eventAbandonedCartEmail({
      ...base,
      resumeUrl: 'https://partyondelivery.com/x" onmouseover="alert(1)',
    });
    // The raw attribute-breaking sequence must not survive.
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).not.toContain('/x" onmouseover');
    expect(html).toContain('&quot;');
  });

  it('renders a legitimate URL intact in the CTA', () => {
    const { html } = eventAbandonedCartEmail(base);
    expect(html).toContain(
      'href="https://partyondelivery.com/events/brian-41st-birthday"',
    );
  });

  it('escapes a quote in the unsubscribe URL too', () => {
    const { html } = eventAbandonedCartEmail({
      ...base,
      unsubscribeUrl: 'https://partyondelivery.com/p?t=1" onclick="x',
    });
    expect(html).not.toContain('onclick="x"');
    expect(html).not.toContain('?t=1" onclick');
  });
});

describe('eventAbandonedCartEmail — field escaping', () => {
  const TAG = '<script>alert(1)</script>';
  const ESCAPED = '&lt;script&gt;alert(1)&lt;/script&gt;';

  it('escapes a tag payload in the event title, venue, and address', () => {
    const { html } = eventAbandonedCartEmail({
      ...base,
      eventTitle: TAG,
      eventVenue: TAG,
      eventAddress: TAG,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain(ESCAPED);
  });

  it("escapes a single quote — the char the template's old local escape() missed", () => {
    const { html } = eventAbandonedCartEmail({ ...base, firstName: "O'Brien" });
    expect(html).toContain('&#39;');
    // The apostrophe in the literal copy ("Don&apos;t be the friend") is
    // already an entity, so no bare ' should remain in the rendered body.
    expect(html).toContain('Hey O&#39;Brien,');
  });
});

describe('eventAbandonedCartEmail — plaintext and subject are NOT html-escaped', () => {
  it('leaves entities out of the subject line', () => {
    const { subject } = eventAbandonedCartEmail({
      ...base,
      firstName: 'Ben & Jerry',
      eventTitle: 'Sam & Dave',
    });
    expect(subject).toContain('Ben & Jerry');
    expect(subject).toContain('Sam & Dave');
    expect(subject).not.toContain('&amp;');
  });

  it('leaves entities out of the plaintext part', () => {
    const { text } = eventAbandonedCartEmail({
      ...base,
      firstName: 'Ben & Jerry',
      eventAddress: 'Tom & Jerry Ln',
    });
    expect(text).toContain('Hey Ben & Jerry,');
    expect(text).toContain('Tom & Jerry Ln');
    expect(text).not.toContain('&amp;');
  });
});

describe('eventAbandonedCartEmail — CAN-SPAM footer', () => {
  it('carries an unsubscribe link and the physical postal address in the HTML', () => {
    const { html } = eventAbandonedCartEmail(base);
    expect(html).toContain(POSTAL_ADDRESS);
    expect(html).toContain('Unsubscribe');
    expect(html).toContain('/email/preferences');
  });

  it('carries both in the plaintext part too', () => {
    const { text } = eventAbandonedCartEmail(base);
    expect(text).toContain(POSTAL_ADDRESS);
    expect(text).toContain(`Unsubscribe: ${base.unsubscribeUrl}`);
  });

  it('no longer tells an email reader to "Reply STOP" (that was SMS copy)', () => {
    const { html, text } = eventAbandonedCartEmail(base);
    expect(html).not.toContain('Reply STOP');
    expect(text).not.toContain('Reply STOP');
  });
});
