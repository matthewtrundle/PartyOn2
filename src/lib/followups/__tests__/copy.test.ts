/**
 * Template semantics for the editable follow-up copy: token substitution,
 * the line-drop rule for missing values, and admin-override precedence.
 */

import { describe, it, expect } from 'vitest';
import type { FollowUpJob } from '@prisma/client';
import {
  renderTemplate,
  buildStepEmail,
  POSTAL_ADDRESS,
  GOOGLE_REVIEW_URL,
} from '../copy';
import type { JourneyEmailContext } from '../types';

function makeCtx(
  payload: Record<string, unknown> = {},
  copyOverrides?: JourneyEmailContext['copyOverrides']
): JourneyEmailContext {
  return {
    job: { id: 'job-1', step: 1 } as unknown as FollowUpJob,
    payload,
    link: (path: string) => `https://partyondelivery.com${path}`,
    unsubscribeUrl: 'https://partyondelivery.com/email/preferences?email=x&token=y',
    copyOverrides,
  };
}

describe('renderTemplate', () => {
  it('substitutes tokens', () => {
    expect(renderTemplate('Hey {firstName}, party for {guestCount}?', { firstName: 'Sam', guestCount: '25' }))
      .toBe('Hey Sam, party for 25?');
  });

  it('drops the whole line when a token has no value', () => {
    const out = renderTemplate(
      'Hey {firstName},\n\nLine one stays.\nPlanning for {guestCount} people.\n\nLine two stays.',
      { firstName: 'Sam', guestCount: null }
    );
    expect(out).not.toContain('Planning for');
    expect(out).toContain('Line one stays.');
    expect(out).toContain('Line two stays.');
  });

  it('treats unknown tokens as missing (line drops) and collapses blank runs', () => {
    const out = renderTemplate('A\n\n{mystery}\n\nB', { firstName: 'x' });
    expect(out).toBe('A\n\nB');
  });
});

describe('buildStepEmail', () => {
  it('renders default copy with payload tokens and the CAN-SPAM footer', () => {
    const email = buildStepEmail('abandoned-quote', 1, makeCtx({ firstName: 'Sam', guestCount: '25', resumePath: '/order' }));
    expect(email).not.toBeNull();
    expect(email!.subject).toBe('your drink numbers from Party On Delivery');
    expect(email!.text).toContain('Hey Sam,');
    expect(email!.text).toContain('about 25 people');
    expect(email!.text).toContain('https://partyondelivery.com/order');
    expect(email!.text).toContain(POSTAL_ADDRESS);
    expect(email!.text).toContain('Unsubscribe:');
    expect(email!.html).toContain(POSTAL_ADDRESS.replace(/&/g, '&amp;'));
  });

  it('drops the guest-count line when unknown but keeps the rest', () => {
    const email = buildStepEmail('abandoned-quote', 1, makeCtx({}));
    expect(email!.text).toContain('Hey there,');
    expect(email!.text).not.toContain('people');
    expect(email!.text).toContain('Pick it back up here');
  });

  it('admin overrides win over defaults', () => {
    const email = buildStepEmail(
      'contact-form',
      1,
      makeCtx(
        { firstName: 'Sam' },
        { 'contact-form': { 1: { subject: 'we got it, {firstName}', body: 'Custom body for {firstName}.' } } }
      )
    );
    expect(email!.subject).toBe('we got it, Sam');
    expect(email!.text).toContain('Custom body for Sam.');
    expect(email!.text).toContain(POSTAL_ADDRESS); // footer always appended
  });

  it('partial override keeps the default for the other field', () => {
    const email = buildStepEmail(
      'contact-form',
      1,
      makeCtx({ firstName: 'Sam' }, { 'contact-form': { 1: { subject: 'custom subject' } } })
    );
    expect(email!.subject).toBe('custom subject');
    expect(email!.text).toContain('I read these personally');
  });

  it('event-quiz step 1 has no copy and returns null', () => {
    expect(buildStepEmail('event-quiz', 1, makeCtx({}))).toBeNull();
  });

  it('post-purchase-review uses the review link verbatim', () => {
    const email = buildStepEmail('post-purchase-review', 1, makeCtx({ firstName: 'Sam' }));
    expect(email!.text).toContain(GOOGLE_REVIEW_URL);
  });
});
