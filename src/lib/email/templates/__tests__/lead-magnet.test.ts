/**
 * The lead-magnet welcome email now doubles as the delivery vehicle for a
 * free-delivery discount code. These tests pin the two behaviors that matter:
 * the code is actually shown (in HTML and text) when present, and the CAN-SPAM
 * footer (unsubscribe + 21+) is on EVERY email regardless of reward type.
 */
import { describe, it, expect } from 'vitest';
import { leadMagnetEmail } from '../lead-magnet';

describe('leadMagnetEmail', () => {
  it('features the code in HTML and text when a rewardCode is present', () => {
    const { subject, html, text } = leadMagnetEmail({
      firstName: 'Sam',
      magnetTitle: 'Free Delivery on Your First Order',
      rewardUrl: '/order',
      rewardCode: 'STOCKED',
    });
    expect(html).toContain('STOCKED');
    expect(html).toMatch(/free-delivery code/i);
    expect(text).toContain('STOCKED');
    expect(subject).toMatch(/free-delivery code/i);
  });

  it('falls back to the playbook copy with no code block when rewardCode is absent', () => {
    const { html, text } = leadMagnetEmail({
      firstName: 'Sam',
      magnetTitle: 'The Party On Delivery Playbook',
      rewardUrl: '/flyer',
    });
    expect(html).not.toMatch(/YOUR FREE-DELIVERY CODE/);
    expect(text).toMatch(/your copy of/i);
  });

  it('keeps the CAN-SPAM footer on both reward types', () => {
    const withCode = leadMagnetEmail({
      firstName: 'A',
      magnetTitle: 'X',
      rewardUrl: '/order',
      rewardCode: 'BDAYPARTY',
    });
    const withoutCode = leadMagnetEmail({
      firstName: 'A',
      magnetTitle: 'X',
      rewardUrl: '/flyer',
    });
    for (const e of [withCode, withoutCode]) {
      expect(e.text).toMatch(/Reply STOP to unsubscribe/);
      expect(e.text).toMatch(/21\+/);
      expect(e.html).toMatch(/unsubscribe/i);
    }
  });

  it('HTML-escapes the first name (defense-in-depth even though inputs are constrained)', () => {
    const { html } = leadMagnetEmail({
      firstName: '<script>x</script>',
      magnetTitle: 'X',
      rewardUrl: '/order',
      rewardCode: 'STOCKED',
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
