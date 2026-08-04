/**
 * Lead provenance taxonomy.
 *
 * Two contracts are load-bearing here:
 *   1. Filter KEYS are frozen — saved board URLs must keep working forever.
 *   2. Channel precedence is the design, not an accident. Each fixture below
 *      pins one adjacent pair in the ladder, so swapping any two rules fails.
 */

import { describe, it, expect } from 'vitest';
import { SOURCE_LABELS } from '../board-types';
import {
  CHANNEL_LABELS,
  LEAD_CHANNELS,
  SOURCE_FILTER_OPTIONS,
  classifyLeadSource,
  isAdsLead,
  refineSource,
  type LeadChannel,
} from '../source-taxonomy';

function classify(
  sourceWidget: string | null,
  metadata: unknown,
  extra: { utmMedium?: string | null; hasAffiliate?: boolean } = {},
) {
  return classifyLeadSource({ sourceWidget, metadata, ...extra });
}

const channelOf = (...args: Parameters<typeof classify>): LeadChannel =>
  classify(...args).channel;

describe('refineSource — frozen filter keys', () => {
  it('returns the widget itself as the key for every known widget', () => {
    for (const widget of Object.keys(SOURCE_LABELS)) {
      expect(refineSource(widget, null).key).toBe(widget);
    }
  });

  it('pins the four CONTACT_FORM sub-keys byte-exactly', () => {
    const cases: Array<[string, string]> = [
      ['unifiedQuote', 'CONTACT_FORM:quote'],
      ['chatQuiz', 'CONTACT_FORM:chat'],
      ['eventQuiz', 'CONTACT_FORM:quiz'],
      ['contactForm', 'CONTACT_FORM:contact'],
    ];
    for (const [meta, key] of cases) {
      expect(refineSource('CONTACT_FORM', { [meta]: {} }).key).toBe(key);
    }
  });

  it('falls back to OTHER for a null widget', () => {
    expect(refineSource(null, null)).toEqual({ key: 'OTHER', label: 'Site' });
  });

  it('every dropdown source option maps to a real key or pseudo-filter', () => {
    const pseudo = new Set(['CONSUMER', 'PARTNER']);
    for (const opt of SOURCE_FILTER_OPTIONS) {
      if (opt.group === 'channel') {
        expect(opt.value.startsWith('channel:')).toBe(true);
        expect(LEAD_CHANNELS).toContain(opt.value.slice('channel:'.length) as LeadChannel);
        continue;
      }
      if (opt.group === 'audience') {
        expect(pseudo.has(opt.value)).toBe(true);
        continue;
      }
      const base = opt.value.split(':')[0];
      expect(Object.keys(SOURCE_LABELS)).toContain(base);
    }
  });

  it('offers no dead options — CALL_BOOKING has no writer anywhere', () => {
    expect(SOURCE_FILTER_OPTIONS.map((o) => o.value)).not.toContain('CALL_BOOKING');
  });
});

describe('refineSource — labels gain detail', () => {
  it('splits a quote by its sub-flow', () => {
    expect(
      refineSource('CONTACT_FORM', { unifiedQuote: { source: 'package-builder' } }).label,
    ).toBe('Quote · Builder');
  });

  it('splits the contact form by which page posted it', () => {
    expect(
      refineSource('CONTACT_FORM', { contactForm: { source: 'plan-event-page' } }).label,
    ).toBe('Contact · Plan Event');
    expect(refineSource('CONTACT_FORM', { contactForm: { source: 'book-now' } }).label).toBe(
      'Contact · Book Now',
    );
  });

  it('falls back to the plain label for an unknown contact source', () => {
    expect(refineSource('CONTACT_FORM', { contactForm: { source: 'zzz' } }).label).toBe(
      'Contact Form',
    );
  });

  it('labels a dashboard by its provenance', () => {
    expect(refineSource('GROUP_DASHBOARD', { groupDashboard: { source: 'WEBHOOK' } }).label).toBe(
      'Dashboard · Boat Webhook',
    );
  });
});

describe('classifyLeadSource — channel precedence', () => {
  it('ops beats everything, including a paid click', () => {
    expect(channelOf('OPS_INVOICE', { attribution: { gclid: 'x' } })).toBe('ops');
    expect(channelOf('GROUP_DASHBOARD', { groupDashboard: { source: 'INTERNAL' } })).toBe('ops');
  });

  it('outbound beats paid — our own prospecting is never bought traffic', () => {
    expect(channelOf('PARTNER_OUTREACH', { attribution: { gclid: 'x' } })).toBe('outbound');
  });

  it('outbound is keyed on the widget, not the partner-prospect tag', () => {
    // A prospect we cold-emailed who later fills in the B2B form is inbound.
    expect(channelOf('PARTNER_INQUIRY', { partnerInquiry: { source: 'hotels' } })).toBe('inbound');
  });

  it('inbound beats paid — a business reaching in is biz-dev, not an ad click', () => {
    expect(channelOf('PARTNER_INQUIRY', { attribution: { gclid: 'x' } }, { utmMedium: 'cpc' })).toBe(
      'inbound',
    );
  });

  it('paid beats partner — an affiliate lead off an ad click is still bought', () => {
    expect(
      channelOf('PARTNER_LANDING_PAGE', { attribution: { gclid: 'x' } }, { hasAffiliate: true }),
    ).toBe('paid');
  });

  it('a webhook dashboard is partner — it can never carry a click id', () => {
    expect(channelOf('GROUP_DASHBOARD', { groupDashboard: { source: 'WEBHOOK' } })).toBe('partner');
    expect(channelOf('GROUP_DASHBOARD', { groupDashboard: { source: 'PARTNER_PAGE' } })).toBe(
      'partner',
    );
  });

  it('a self-serve dashboard falls through to whatever attribution says', () => {
    expect(channelOf('GROUP_DASHBOARD', { groupDashboard: { source: 'DIRECT' } })).toBe('direct');
    expect(
      channelOf('GROUP_DASHBOARD', {
        groupDashboard: { source: 'DIRECT' },
        attribution: { gclid: 'x' },
      }),
    ).toBe('paid');
  });

  it('treats a paid medium case-insensitively', () => {
    expect(channelOf('OTHER', null, { utmMedium: 'CPC' })).toBe('paid');
    expect(channelOf('OTHER', null, { utmMedium: ' Paid ' })).toBe('paid');
  });

  it('separates organic search from a plain referral', () => {
    expect(channelOf('OTHER', { attribution: { referrer: 'https://www.google.com/search?q=x' } })).toBe(
      'organic',
    );
    expect(channelOf('OTHER', { attribution: { referrer: 'https://www.theknot.com/vendor' } })).toBe(
      'referral',
    );
    expect(channelOf('OTHER', null, { utmMedium: 'organic' })).toBe('organic');
  });

  it('does not count our own site as a referral', () => {
    expect(
      channelOf('OTHER', { attribution: { referrer: 'https://partyondelivery.com/blog' } }),
    ).toBe('direct');
  });

  it('treats owned non-paid mediums as referral', () => {
    for (const medium of ['referral', 'email', 'sms', 'social']) {
      expect(channelOf('OTHER', null, { utmMedium: medium })).toBe('referral');
    }
  });

  it('defaults to direct', () => {
    expect(channelOf('OTHER', null)).toBe('direct');
    expect(channelOf(null, {})).toBe('direct');
  });

  it.each(['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'])(
    'returns a plain string label for a stored source of %s',
    (evil) => {
      // These strings resolve to Object.prototype members on a plain-object
      // lookup, so a label could come back as a FUNCTION — which React throws
      // on ("Functions are not valid as a React child"), taking the drawer
      // down for that card. Every metadata-keyed table is a Map.
      for (const meta of [
        { contactForm: { source: evil } },
        { unifiedQuote: { source: evil } },
        { groupDashboard: { source: evil } },
        { quickBuy: { occasion: evil } },
        { partnerInquiry: { source: evil } },
      ]) {
        const result = classify('CONTACT_FORM', meta);
        expect(typeof result.label).toBe('string');
        expect(typeof result.key).toBe('string');
        if (result.formLabel !== null) expect(typeof result.formLabel).toBe('string');
        if (result.formKey !== null) expect(typeof result.formKey).toBe('string');
      }
    },
  );

  it('returns a plain string label for a prototype-named widget', () => {
    for (const evil of ['constructor', 'toString', '__proto__']) {
      expect(typeof refineSource(evil, null).label).toBe('string');
    }
  });

  it('never throws on malformed metadata', () => {
    for (const bad of [null, undefined, 'a string', 42, [], [{ a: 1 }]]) {
      expect(() => classify('OTHER', bad)).not.toThrow();
      expect(classify('OTHER', bad).channel).toBe('direct');
    }
  });

  it('labels every channel', () => {
    for (const c of LEAD_CHANNELS) expect(CHANNEL_LABELS[c]).toBeTruthy();
  });
});

describe('classifyLeadSource — which form was submitted', () => {
  it('prefers the more specific surface when several are present', () => {
    // A lead can accumulate surfaces over time; the quote is the real intent.
    const result = classify('CONTACT_FORM', {
      contactForm: { source: 'contact' },
      unifiedQuote: { source: 'chat' },
    });
    expect(result.formKey).toBe('quote:chat');
  });

  it('derives a stable key per contact page', () => {
    expect(classify('CONTACT_FORM', { contactForm: { source: 'plan-event-page' } }).formKey).toBe(
      'contact:plan-event-page',
    );
    // Older rows captured before the source was recorded still resolve.
    expect(classify('CONTACT_FORM', { contactForm: {} }).formKey).toBe('contact:contact');
  });

  it('derives keys for the dashboard, quick buy, B2B and magnet surfaces', () => {
    expect(classify('GROUP_DASHBOARD', { groupDashboard: { source: 'WEBHOOK' } }).formKey).toBe(
      'dashboard:webhook',
    );
    expect(classify('QUICK_BUY', { quickBuy: { occasion: 'wedding' } }).formKey).toBe(
      'quickbuy:wedding',
    );
    expect(
      classify('PARTNER_INQUIRY', { partnerInquiry: { source: 'hotels-resorts-page' } }).formKey,
    ).toBe('partner-inquiry:hotels-resorts-page');
    expect(classify('LEAD_MAGNET', { leadMagnet: { magnetId: 'pod-playbook' } }).formKey).toBe(
      'lead-magnet:pod-playbook',
    );
  });

  it('falls back to the widget for server-stamped surfaces with no metadata', () => {
    expect(classify('INBOUND_EMAIL', {}).formKey).toBe('inbound-email');
    expect(classify('PARTNER_OUTREACH', {}).formKey).toBe('outbound-prospect');
    expect(classify('WAYNE_CHAT', {}).formKey).toBe('wayne-chat');
  });

  it('returns null when nothing recorded a form — the capture-gap signal', () => {
    expect(classify('OTHER', {}).formKey).toBeNull();
    expect(classify('OTHER', {}).formLabel).toBeNull();
    expect(classify('DRINK_CALCULATOR', null).formKey).toBeNull();
  });

  it('covers every drawer submission surface (anti-drift)', () => {
    // If a new capture surface is added to the drawer without a taxonomy
    // entry, its leads would show a form in one place and not the other.
    const surfaces = [
      'conciergeQuiz',
      'unifiedQuote',
      'chatQuiz',
      'eventQuiz',
      'contactForm',
      'quickBuy',
      'partnerInquiry',
      'leadMagnet',
    ];
    for (const surface of surfaces) {
      expect(classify('CONTACT_FORM', { [surface]: {} }).formKey, surface).not.toBeNull();
    }
  });
});

describe('isAdsLead', () => {
  it('detects a click id or a paid medium', () => {
    expect(isAdsLead({ utmMedium: 'cpc', metadata: null })).toBe(true);
    expect(isAdsLead({ utmMedium: null, metadata: { attribution: { gclid: 'x' } } })).toBe(true);
    expect(isAdsLead({ utmMedium: 'organic', metadata: null })).toBe(false);
    expect(isAdsLead({ utmMedium: null, metadata: { attribution: {} } })).toBe(false);
  });
});
