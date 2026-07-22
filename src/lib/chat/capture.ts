/**
 * Wayne chat capture orchestration.
 *
 * `persistChatTurn` runs after each `/api/chat` reply (via `after()`, so it never
 * blocks the response). It (1) upserts the ChatConversation transcript, (2) emails
 * Allan once when the conversation escalates (refund/complaint/legal/safety), and
 * (3) creates a Lead — reusing the exact machinery the quiz uses (`upsertLead`,
 * `recordEvent`, `mirrorLeadToCrm`, which auto-flows the lead to the CRM + Lead
 * Flow board) — when the customer gives contact info.
 *
 * NEVER throws: a capture hiccup must not affect the customer's chat.
 */
import { LeadEventType } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { upsertLead, recordEvent } from '@/lib/leads/leadCapture';
import { mirrorLeadToCrm, leadBoardUrl } from '@/lib/leads/crm-mirror';
import { detectEscalation } from './escalation-keywords';
import { parseContact, hasContact } from './parse-contact';
import { sendChatEscalationEmail } from './escalation-alert';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatTurnInput {
  conversationId: string;
  /** Full transcript so far, including the assistant reply just produced. */
  messages: ChatMessage[];
  firstPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export async function persistChatTurn(input: ChatTurnInput): Promise<void> {
  try {
    const { conversationId, messages } = input;
    if (!conversationId || !Array.isArray(messages) || messages.length === 0) return;

    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content ?? '';
    const reason = detectEscalation(lastUserMessage);
    const contact = parseContact(userMessages.map((m) => m.content).join('\n'));

    // 1. Upsert the transcript (create on first turn, replace messages each turn).
    const convo = await prisma.chatConversation.upsert({
      where: { conversationId },
      create: {
        conversationId,
        messages: messages as unknown as object,
        firstPage: input.firstPage ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        escalated: Boolean(reason),
        escalationReason: reason,
      },
      update: {
        messages: messages as unknown as object,
        ...(reason ? { escalated: true, escalationReason: reason } : {}),
      },
    });

    // 2. Capture a Lead when contact is present and not already linked.
    let leadId: string | null = convo.leadId;
    if (hasContact(contact) && !leadId) {
      const lead = await upsertLead(
        { email: contact.email, phone: contact.phone, firstName: contact.firstName },
        {
          sourcePage: input.firstPage ?? '/chat',
          sourceWidget: 'WAYNE_CHAT',
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
        }
      );
      if (lead) {
        leadId = lead.id;
        await recordEvent({
          type: LeadEventType.FORM_SUBMIT,
          leadId: lead.id,
          page: input.firstPage ?? '/chat',
          widget: 'WAYNE_CHAT',
          trustedSubmit: true,
          metadata: { conversationId, via: 'wayne-chat' },
        });
        await prisma.chatConversation.update({
          where: { id: convo.id },
          data: { leadId: lead.id, contactCapturedAt: new Date() },
        });
        // Fire-and-forget CRM mirror (never throws; inert until CORELINQ_INGEST_URL set).
        await mirrorLeadToCrm({ leadId: lead.id }, 'wayne-chat');
      }
    }

    // 3. Escalation email — at most once per conversation.
    if (reason && !convo.escalationNotifiedAt) {
      const sent = await sendChatEscalationEmail({
        conversationId,
        reason,
        lastUserMessage,
        transcript: messages,
        leadUrl: leadId ? leadBoardUrl(leadId) : null,
        contact,
      });
      if (sent) {
        await prisma.chatConversation.update({
          where: { id: convo.id },
          data: { escalationNotifiedAt: new Date() },
        });
      }
    }
  } catch (err) {
    console.warn('[wayne-capture] persistChatTurn failed:', err);
  }
}
