/**
 * Escalation keyword detection for the free-form Wayne chat (`/api/chat`).
 *
 * These lists MIRROR the playbook's escalation keyword classes
 * (`content/playbook/escalation.md`) and the CRM fork's
 * `apps/web/lib/ai-inbox/escalation-triggers.ts`. Keep the three in sync when
 * any changes. Word-boundary matched, case-insensitive. Bare "minor" is
 * deliberately excluded ("a minor issue" must not trip safety) — same call as
 * the fork's safety class.
 */

export type EscalationReason = 'safety' | 'legal' | 'refund' | 'complaint';

/** Most-serious first — the first match wins, so this orders the label. */
const KEYWORDS: Record<EscalationReason, string[]> = {
  safety: [
    'underage', 'under age', 'under 21', 'not 21', 'fake id', 'minors',
    'teenager', 'high school', 'drunk', 'wasted', 'hammered', 'intoxicated',
    'blacked out', 'passed out', 'overserved', 'over served',
    'alcohol poisoning', 'too much to drink', 'got hurt', 'injured', 'injury',
    'ambulance', 'hospital', 'emergency',
  ],
  legal: [
    'lawyer', 'attorney', 'legal', 'lawsuit', 'sue', 'dispute', 'scam',
    'fraud', 'better business bureau', 'bbb',
  ],
  refund: [
    'refund', 'chargeback', 'charge back', 'money back', 'never received',
    "haven't received", 'have not received', "didn't receive",
    'did not receive', 'still waiting', 'cancel my order', 'cancel order',
  ],
  complaint: [
    'complaint', 'unacceptable', 'terrible', 'awful', 'worst', 'disappointed',
    'frustrated', 'angry', 'ridiculous', 'unhappy',
  ],
};

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text);
}

/**
 * Return the first (most-serious) escalation reason present in the text, or
 * null. Used on the customer's latest message in a Wayne chat.
 */
export function detectEscalation(text: string): EscalationReason | null {
  if (!text) return null;
  for (const reason of Object.keys(KEYWORDS) as EscalationReason[]) {
    if (KEYWORDS[reason].some((kw) => matchesKeyword(text, kw))) return reason;
  }
  return null;
}

export const REASON_LABEL: Record<EscalationReason, string> = {
  safety: 'Safety / minors / intoxication',
  legal: 'Legal / fraud / dispute',
  refund: 'Refund / cancellation',
  complaint: 'Complaint / negative sentiment',
};
