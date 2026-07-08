'use client';

/**
 * Browser-side helpers for the lead-capture system.
 *
 * Exposes:
 *   - sendLeadEvent(): low-level POST to /api/v1/landing/lead-event
 *   - useLeadCapture(): React hook that returns helpers for forms
 *     (onBlurField, onStepComplete, onSubmit) bound to a widget + page
 *   - fireVisitorPixel(): page-view beacon, called once per pathname
 *
 * Failure is silent — lead capture must never block the UX.
 */
import { useCallback, useMemo } from 'react';

import { getAttribution } from '@/lib/analytics/attribution';
import { isCompleteEmail } from './email-validation';

const LEAD_EVENT_URL = '/api/v1/landing/lead-event';
const PIXEL_URL = '/api/v1/landing/visitor-pixel';

export type LeadWidget =
  | 'QUICK_BUY'
  | 'PACKAGE_BUILDER'
  | 'A_LA_CARTE'
  | 'CALL_BOOKING'
  | 'EMAIL_SIGNUP'
  | 'CONTACT_FORM'
  | 'DRINK_CALCULATOR'
  | 'OTHER';

export type LeadEventType =
  | 'PAGE_VIEW'
  | 'FIELD_FOCUS'
  | 'FIELD_BLUR'
  | 'STEP_COMPLETE'
  | 'CART_ADD'
  | 'FORM_SUBMIT'
  | 'CHECKOUT_START'
  | 'CONVERSION'
  | 'CUSTOM';

export type LeadStatus =
  | 'ANONYMOUS'
  | 'PARTIAL'
  | 'SUBMITTED'
  | 'CONVERTED'
  | 'ARCHIVED';

export type Identify = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type SendLeadEventInput = {
  type: LeadEventType;
  page?: string;
  widget?: LeadWidget;
  fieldName?: string;
  fieldValue?: string | number | boolean | null;
  identify?: Identify;
  metadata?: Record<string, unknown>;
  setStatus?: LeadStatus;
  resumeCart?: unknown;
};

function readUtm(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  try {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl: Record<string, string | null> = {
      utmSource: sp.get('utm_source'),
      utmMedium: sp.get('utm_medium'),
      utmCampaign: sp.get('utm_campaign'),
      utmContent: sp.get('utm_content'),
      utmTerm: sp.get('utm_term'),
      gclid: sp.get('gclid'),
      gbraid: sp.get('gbraid'),
      wbraid: sp.get('wbraid'),
      fbclid: sp.get('fbclid'),
      msclkid: sp.get('msclkid'),
    };
    // Fall back to the stored first-touch payload for anything the current
    // URL doesn't carry — UTM/click-id params drop off after the visitor
    // navigates internally (e.g. landing page → event-quiz → builder).
    const stored = getAttribution();
    if (stored) {
      const fallback: Record<string, string | null | undefined> = {
        utmSource: stored.utmSource,
        utmMedium: stored.utmMedium,
        utmCampaign: stored.utmCampaign,
        utmContent: stored.utmContent,
        utmTerm: stored.utmTerm,
        gclid: stored.gclid,
        gbraid: stored.gbraid,
        wbraid: stored.wbraid,
        fbclid: stored.fbclid,
        msclkid: stored.msclkid,
      };
      for (const [key, value] of Object.entries(fallback)) {
        if (!fromUrl[key] && value) fromUrl[key] = value;
      }
    }
    return fromUrl;
  } catch {
    return {};
  }
}

export async function sendLeadEvent(input: SendLeadEventInput) {
  if (typeof window === 'undefined') return null;
  const utm = readUtm();
  try {
    const res = await fetch(LEAD_EVENT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true, // survive page navigations
      body: JSON.stringify({
        type: input.type,
        page: input.page ?? window.location.pathname,
        widget: input.widget ?? 'OTHER',
        fieldName: input.fieldName ?? null,
        fieldValue:
          input.fieldValue == null ? null : String(input.fieldValue).slice(0, 2000),
        identify: input.identify ?? undefined,
        utm,
        metadata: input.metadata ?? null,
        setStatus: input.setStatus,
        resumeCart: input.resumeCart,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      ok: boolean;
      sessionId: string;
      leadId: string | null;
    };
  } catch {
    return null;
  }
}

export async function fireVisitorPixel(page: string) {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(PIXEL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        page,
        referrer: document.referrer || null,
        utm: readUtm(),
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      ok: boolean;
      sessionId: string;
      leadId: string | null;
      returning: boolean;
    };
  } catch {
    return null;
  }
}

/**
 * Drop `identify.email` when it is still a mid-typing fragment (`an@`,
 * `@gmail.com`). The field-blur event + its raw `fieldValue` still fire so
 * funnel/drop-off analysis is unchanged — we only refuse to let an
 * incomplete address anchor a Lead row (and, downstream, an abandoned-quote
 * follow-up that would hard-bounce).
 */
function stripIncompleteEmail(identify?: Identify): Identify | undefined {
  if (!identify || identify.email == null || isCompleteEmail(identify.email)) {
    return identify;
  }
  const rest: Identify = { ...identify };
  delete rest.email;
  return rest;
}

/**
 * React hook bound to a widget + page slug. Returns convenience functions
 * for the most common form-instrumentation patterns.
 */
export function useLeadCapture(opts: { widget: LeadWidget; page?: string }) {
  const { widget, page } = opts;

  const onBlurField = useCallback(
    (fieldName: string, value: string | number | null | undefined, identify?: Identify) => {
      if (value == null || String(value).trim() === '') return;
      void sendLeadEvent({
        type: 'FIELD_BLUR',
        widget,
        page,
        fieldName,
        fieldValue: value,
        identify: stripIncompleteEmail(identify),
      });
    },
    [widget, page],
  );

  const onStepComplete = useCallback(
    (stepKey: string, metadata?: Record<string, unknown>, identify?: Identify) => {
      void sendLeadEvent({
        type: 'STEP_COMPLETE',
        widget,
        page,
        fieldName: stepKey,
        identify,
        metadata,
      });
    },
    [widget, page],
  );

  const onFormSubmit = useCallback(
    (identify: Identify, metadata?: Record<string, unknown>, resumeCart?: unknown) => {
      void sendLeadEvent({
        type: 'FORM_SUBMIT',
        widget,
        page,
        identify,
        metadata,
        resumeCart,
        setStatus: 'SUBMITTED',
      });
    },
    [widget, page],
  );

  const onCheckoutStart = useCallback(
    (identify: Identify, metadata?: Record<string, unknown>, resumeCart?: unknown) => {
      void sendLeadEvent({
        type: 'CHECKOUT_START',
        widget,
        page,
        identify,
        metadata,
        resumeCart,
        setStatus: 'SUBMITTED',
      });
    },
    [widget, page],
  );

  return useMemo(
    () => ({ onBlurField, onStepComplete, onFormSubmit, onCheckoutStart, sendLeadEvent }),
    [onBlurField, onStepComplete, onFormSubmit, onCheckoutStart],
  );
}
