/**
 * draft-lint: the Hormozi contract as executable rules — word bounds per
 * touch, subject shape, banned phrases, meeting-ask detection, single-CTA
 * question mark, link cap, and no inline signature/footer. Includes a
 * legacy-style ~221-word draft fixture that must fail (regenerate, never
 * auto-approve).
 */

import { describe, it, expect } from 'vitest';
import { lintDraft, wordCount, type LintableDraft } from '../draft-lint';

const words = (n: number, filler = 'word') => Array.from({ length: n }, () => filler).join(' ');

function cleanDraft(overrides: Partial<LintableDraft> = {}): LintableDraft {
  return {
    subject: 'guest perk',
    altSubject: 'stocked fridges',
    body: `Hi Lynn — ${words(70)}. Want me to send over the details?`,
    followUpBody: `Your page is live. ${words(40)}.`,
    touch3Body: `If this is not a fit, tell me and I will not write again. ${words(30)}.`,
    ...overrides,
  };
}

describe('lintDraft — clean drafts', () => {
  it('passes a compliant 3-touch draft', () => {
    expect(lintDraft(cleanDraft())).toEqual([]);
  });
});

describe('subjects', () => {
  it('rejects >3 words, uppercase, and punctuation', () => {
    const issues = lintDraft(
      cleanDraft({ subject: 'Free Guest Perk For You!', altSubject: 'ok subject' })
    );
    const subjectIssues = issues.filter((i) => i.field === 'subject');
    expect(subjectIssues.some((i) => i.message.includes('1–3 words'))).toBe(true);
    expect(subjectIssues.some((i) => i.message.includes('lowercase'))).toBe(true);
    expect(subjectIssues.some((i) => i.message.includes('punctuation'))).toBe(true);
  });

  it('rejects altSubject identical to subject; warns when missing', () => {
    expect(
      lintDraft(cleanDraft({ altSubject: 'Guest Perk' })).some(
        (i) => i.field === 'altSubject' && i.message.includes('identical')
      )
    ).toBe(true);
    expect(
      lintDraft(cleanDraft({ altSubject: null })).some(
        (i) => i.field === 'altSubject' && i.severity === 'warning'
      )
    ).toBe(true);
  });
});

describe('body bounds + CTA', () => {
  it('fails a legacy ~221-word feature-dump draft', () => {
    const legacy = cleanDraft({
      body: `Hi Lynn — ${words(215)}. Want me to send over the details?`,
    });
    expect(
      lintDraft(legacy).some(
        (i) => i.field === 'body' && i.severity === 'error' && i.message.includes('words')
      )
    ).toBe(true);
  });

  it('fails under 60 words, warns 111–120', () => {
    expect(
      lintDraft(cleanDraft({ body: 'Hi — short. Want me to send it?' })).some(
        (i) => i.field === 'body' && i.severity === 'error'
      )
    ).toBe(true);
    const longish = lintDraft(
      cleanDraft({ body: `Hi Lynn — ${words(108)}. Want me to send over the details?` })
    );
    expect(longish.some((i) => i.field === 'body' && i.severity === 'warning')).toBe(true);
    expect(longish.some((i) => i.field === 'body' && i.severity === 'error')).toBe(false);
  });

  it('requires exactly one question mark', () => {
    expect(
      lintDraft(
        cleanDraft({ body: `Hi Lynn — ${words(70)}. How are you? Want me to send it?` })
      ).some((i) => i.message.includes('question marks'))
    ).toBe(true);
    expect(
      lintDraft(cleanDraft({ body: `Hi Lynn — ${words(70)}. This has no CTA at all.` })).some(
        (i) => i.message.includes('question marks')
      )
    ).toBe(true);
  });
});

describe('banned content', () => {
  it('flags banned phrases, piled-on exclamation points, meeting asks', () => {
    const issues = lintDraft(
      cleanDraft({
        body: `Hi Lynn — I hope this finds you well! I'm excited about this! ${words(55)}. Worth a 15-minute call this week?`,
      })
    );
    const messages = issues.map((i) => i.message).join(' | ');
    expect(messages).toContain('banned phrase');
    expect(messages).toContain('exclamation');
    expect(messages).toContain('meeting/call ask');
  });

  it('allows a single exclamation point (a greeting is not spam)', () => {
    const issues = lintDraft(
      cleanDraft({ body: `Hi there! ${words(60)}. Want me to send it over?` })
    );
    expect(issues.some((i) => i.message.includes('exclamation'))).toBe(false);
  });

  it('flags inline signatures and unsubscribe text in any touch', () => {
    const issues = lintDraft(
      cleanDraft({
        followUpBody: `${words(30)}.\n\nBrian Hill\nFounder, Party On Delivery`,
        touch3Body: `${words(30)}. Unsubscribe anytime.`,
      })
    );
    expect(issues.some((i) => i.field === 'followUpBody' && i.message.includes('signature'))).toBe(true);
    expect(issues.some((i) => i.field === 'touch3Body' && i.message.includes('unsubscribe'))).toBe(true);
  });

  it('caps links at one per touch', () => {
    expect(
      lintDraft(
        cleanDraft({
          body: `Hi Lynn — ${words(60)} https://a.com https://b.com. Want me to send it?`,
        })
      ).some((i) => i.message.includes('links'))
    ).toBe(true);
  });
});

describe('follow-up + touch 3 bounds', () => {
  it('caps both at 120 words', () => {
    const issues = lintDraft(
      cleanDraft({ followUpBody: `${words(125)}.`, touch3Body: `${words(125)}.` })
    );
    expect(issues.filter((i) => i.message.includes('max is 120'))).toHaveLength(2);
  });

  it('allows a follow-up between the old 90 cap and the new 120 one', () => {
    const issues = lintDraft(cleanDraft({ followUpBody: `${words(106)}.` }));
    expect(issues.some((i) => i.field === 'followUpBody' && i.message.includes('words'))).toBe(
      false
    );
  });
});

describe('wordCount', () => {
  it('counts words robustly', () => {
    expect(wordCount('  a  b\nc ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
});
