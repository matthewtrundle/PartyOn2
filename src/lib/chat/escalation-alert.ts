/**
 * Operator email alert when a free-form Wayne chat escalates (refund, complaint,
 * legal, safety). Modeled on `src/lib/webhooks/corelinq-alert.ts`: Resend
 * `sendEmail` to OPS_ALERT_EMAIL, time-bounded so a slow send never holds the
 * chat response, never throws. Sent at most once per conversation — the caller
 * gates on `ChatConversation.escalationNotifiedAt`.
 *
 * Email only (operator decision 2026-07-22): there is no SMS-to-operator
 * capability in the codebase, and this is the durable record with a board link.
 */
import { EmailType } from '@prisma/client';
import { sendEmail } from '@/lib/email/resend-client';
import { REASON_LABEL, type EscalationReason } from './escalation-keywords';
import type { ParsedContact } from './parse-contact';

const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'allan@partyondelivery.com';
const SEND_TIMEOUT_MS = 3000;
const MSG_MAX = 500;

/** Minimal HTML escape for text-node contexts (& first so &lt; survives). */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface ChatEscalationInput {
  conversationId: string;
  reason: EscalationReason;
  lastUserMessage: string;
  transcript: Array<{ role: string; content: string }>;
  leadUrl: string | null;
  contact: ParsedContact;
}

/**
 * Email Allan that a Wayne chat escalated. Returns true only if the send
 * actually completed (so the caller stamps escalationNotifiedAt and won't
 * re-alert); a timeout or failure returns false and leaves it un-stamped.
 */
export async function sendChatEscalationEmail(input: ChatEscalationInput): Promise<boolean> {
  try {
    const { reason, lastUserMessage, transcript, leadUrl, contact, conversationId } = input;

    const recent = transcript
      .slice(-8)
      .map(
        (m) =>
          `<p style="margin:4px 0"><b>${m.role === 'user' ? 'Customer' : 'Wayne'}:</b> ${escapeHtml(
            String(m.content ?? '')
          ).slice(0, MSG_MAX)}</p>`
      )
      .join('');

    const contactLine =
      [contact.firstName, contact.email, contact.phone].filter(Boolean).join(' · ') ||
      '(not captured — no contact given yet)';

    const html = `
      <h2>Wayne chat escalation — ${escapeHtml(REASON_LABEL[reason])}</h2>
      <p><b>Trigger message:</b> ${escapeHtml(lastUserMessage).slice(0, MSG_MAX)}</p>
      <p><b>Customer:</b> ${escapeHtml(contactLine)}</p>
      ${
        leadUrl
          ? `<p><a href="${escapeHtml(leadUrl)}">Open the lead on the board →</a></p>`
          : '<p style="color:#888">No lead yet — the customer has not given contact info.</p>'
      }
      <h3>Recent messages</h3>
      ${recent}
      <p style="color:#888;font-size:12px">Conversation ${escapeHtml(
        conversationId
      )}. Automated ops alert from the Wayne chat.</p>
    `;

    const result = await Promise.race([
      sendEmail({
        to: OPS_ALERT_EMAIL,
        subject: `Wayne chat escalation — ${REASON_LABEL[reason]}`,
        type: EmailType.WELCOME, // reuse — internal ops alert, no dedicated type (matches corelinq-alert)
        html,
        metadata: { kind: 'wayne-chat-escalation', reason, conversationId },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SEND_TIMEOUT_MS)),
    ]);

    return result !== null;
  } catch (err) {
    console.error('[wayne-capture] escalation email failed:', err);
    return false;
  }
}
