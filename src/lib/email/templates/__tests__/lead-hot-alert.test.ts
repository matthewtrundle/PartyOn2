import { describe, expect, it } from 'vitest';
import {
  buildHotLeadAlertEmail,
  toAlertItems,
  type HotAlertRow,
} from '../lead-hot-alert';

const NOW = new Date('2026-08-10T12:00:00Z'); // → CT calendar day Aug 10

function row(over: Partial<HotAlertRow> = {}): HotAlertRow {
  return {
    id: 'lead-a',
    first_name: 'Sarah',
    last_name: 'Miller',
    email: 'sarah@example.com',
    phone: null,
    lead_score: 82,
    metadata: { contactForm: { eventType: 'bachelor party', eventDate: '2026-08-15', guestCount: 12 } },
    fresh_inbound: false,
    ...over,
  };
}

describe('toAlertItems', () => {
  it('builds a hot-lead meta line with score, occasion, countdown, headcount', () => {
    const [item] = toAlertItems([row()], NOW, 'https://x.test');
    expect(item.name).toBe('Sarah Miller');
    expect(item.contact).toBe('sarah@example.com');
    expect(item.meta).toContain('hot 82');
    expect(item.meta).toContain('bachelor party');
    expect(item.meta).toContain('in 5d');
    expect(item.meta).toContain('12 ppl');
    expect(item.url).toBe('https://x.test/admin/leads?lead=lead-a');
  });

  it('flags an inbound lead with "emailed you" and its temperature', () => {
    const [item] = toAlertItems(
      [row({ id: 'b', first_name: null, last_name: null, lead_score: 45, metadata: null, fresh_inbound: true })],
      NOW,
      'https://x.test',
    );
    expect(item.name).toBe('sarah@example.com'); // falls back to email when no name
    expect(item.meta).toContain('emailed you');
    expect(item.meta).toContain('warm 45');
  });

  it('handles a lead with no score or facts', () => {
    const [item] = toAlertItems(
      [row({ lead_score: null, metadata: null, fresh_inbound: true, email: null, phone: '5125551234' })],
      NOW,
      'https://x.test',
    );
    expect(item.contact).toBe('5125551234');
    expect(item.meta).toBe('emailed you');
  });

  it('collapses newlines in lead-supplied fields (no plain-text line injection)', () => {
    const [item] = toAlertItems(
      [
        row({
          first_name: 'Evil\nInjected: call (555) 000-0000',
          last_name: null,
          metadata: { contactForm: { eventType: 'party\nsecond line' } },
        }),
      ],
      NOW,
      'https://x.test',
    );
    expect(item.name).not.toContain('\n');
    expect(item.name).toBe('Evil Injected: call (555) 000-0000');
    expect(item.meta).not.toContain('\n');
  });
});

describe('buildHotLeadAlertEmail', () => {
  it('pluralizes the subject by count', () => {
    const one = buildHotLeadAlertEmail(toAlertItems([row()], NOW, 'https://x.test'), 'https://x.test');
    expect(one.subject).toBe('1 lead needs a reply — Party On Delivery');
    const two = buildHotLeadAlertEmail(
      toAlertItems([row(), row({ id: 'c' })], NOW, 'https://x.test'),
      'https://x.test',
    );
    expect(two.subject).toBe('2 leads need a reply — Party On Delivery');
  });

  it('renders name, deep link, and a board link in both html and text', () => {
    const email = buildHotLeadAlertEmail(toAlertItems([row()], NOW, 'https://x.test'), 'https://x.test');
    expect(email.html).toContain('Sarah Miller');
    expect(email.html).toContain('https://x.test/admin/leads?lead=lead-a');
    expect(email.html).toContain('Open the Lead Flow board');
    expect(email.text).toContain('• Sarah Miller');
    expect(email.text).toContain('https://x.test/admin/leads');
  });

  it('HTML-escapes lead-derived text, including quotes', () => {
    const email = buildHotLeadAlertEmail(
      toAlertItems([row({ first_name: `A<script>"x'y`, last_name: null })], NOW, 'https://x.test'),
      'https://x.test',
    );
    expect(email.html).toContain('A&lt;script&gt;&quot;x&#39;y');
    expect(email.html).not.toContain('A<script>');
    expect(email.html).not.toContain('"x\'y'); // raw quotes never reach the markup
  });
});
