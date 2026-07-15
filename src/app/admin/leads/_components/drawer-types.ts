/**
 * Client-side shape of GET /api/v1/admin/leads/[id] — only the fields the
 * drawer renders. Server returns the full Prisma Lead; extra fields ignored.
 */

export interface LeadDetail {
  lead: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
    pipelineStage: string | null;
    leadScore: number | null;
    scoreBreakdown: Record<string, number> | null;
    sourcePage: string | null;
    sourceWidget: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    owner: string | null;
    snoozedUntil: string | null;
    notes: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  };
  events: Array<{
    id: string;
    type: string;
    page: string | null;
    widget: string | null;
    fieldName: string | null;
    metadata: Record<string, unknown> | null;
    occurredAt: string;
  }>;
  followUps: Array<{
    id: string;
    journeyKey: string;
    step: number;
    status: string;
    scheduledFor: string;
    sentAt: string | null;
    cancelReason: string | null;
  }>;
  emailLogs: Array<{
    id: string;
    subject: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    orderNumber: number;
    total: number;
    createdAt: string;
    isGroupParticipant: boolean;
  }>;
  drafts: Array<{
    id: string;
    status: string;
    total: unknown;
    createdAt: string;
    token: string;
  }>;
  /** Customer emails received at info@ (Gmail poller), newest first. */
  inboundEmails: Array<{
    id: string;
    fromEmail: string;
    fromName: string | null;
    subject: string | null;
    snippet: string | null;
    bodyText: string | null;
    receivedAt: string;
  }>;
}
