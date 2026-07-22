/**
 * Go High Level (GHL) Webhook — Premiere Credit SMS.
 *
 * Fires the inbound webhook that drives the "Premiere Credit — SMS" GHL
 * workflow (upsert contact → tag → send SMS with the code + expiry). Lives in
 * its own file because src/lib/webhooks/ghl.ts is already near the 500-line
 * limit. Mirrors every event to CoreLinq via the shared postToCoreLinq helper.
 *
 * Fire-and-forget: logs errors, never throws. No-ops silently when
 * GHL_PREMIERE_CREDIT_WEBHOOK_URL is not set — inert until the workflow exists.
 */

import { postToCoreLinq } from './ghl';

const GHL_PREMIERE_CREDIT_WEBHOOK_URL = process.env.GHL_PREMIERE_CREDIT_WEBHOOK_URL;

export interface GhlPremiereCreditPayload {
  event: 'premiere.credit.issued';
  /** GHL-standard contact fields (used by the Upsert Contact action). */
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** Template variables for the SMS body. */
  credit_code: string;
  credit_amount: string; // e.g. "336.21"
  expires_on: string;    // human-formatted, e.g. "September 20, 2026"
  redeem_url: string;
  /** Tag the receiving workflow applies to the contact. */
  tags: ['premiere-credit'];
}

/**
 * POST a Premiere credit to the GHL webhook so the receiving workflow can
 * upsert the contact and text them the code. The CoreLinq mirror still fires
 * even when the GHL URL is unset.
 */
export async function notifyPremiereCreditIssued(
  payload: GhlPremiereCreditPayload,
): Promise<void> {
  await postToCoreLinq(payload);
  if (!GHL_PREMIERE_CREDIT_WEBHOOK_URL) return;

  try {
    const res = await fetch(GHL_PREMIERE_CREDIT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[GHL Premiere Credit Webhook] Failed:', res.status, await res.text());
    } else {
      console.log('[GHL Premiere Credit Webhook] Sent:', payload.credit_code);
    }
  } catch (err) {
    console.error('[GHL Premiere Credit Webhook] Error:', err);
  }
}
