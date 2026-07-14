/**
 * Inbound-email ingestion — poll the info@ Gmail INBOX, turn person-to-person
 * mail into Lead Flow board cards, and store each message so the drawer can
 * show "what people are emailing us".
 *
 * Mirrors the server-stamped lead pattern in dashboard-lead.ts: upsertLead +
 * enroll, NO trustedSubmit — an inbound email must not reopen a WON/LOST card
 * (that power stays with the server-zod submit routes). Idempotent by Gmail
 * message id (inbound_emails.gmail_message_id is UNIQUE), so overlapping polls
 * never double-insert. Board bookkeeping never throws the caller.
 */
import { Prisma, type Lead } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { enrollLeadIfEligible } from './pipeline';
import { markLeadStatus, upsertLead } from './leadCapture';
import {
  getGmailClient,
  inboundMailbox,
  isGmailInboundConfigured,
  safeErrorMessage,
} from '@/lib/email/gmail-client';
import { parseGmailMessage, shouldIngestInbound, type ParsedInbound } from './inbound-email-parse';

/** Stop creating new leads past this many per poll — a public inbox is an
 *  unauthenticated mutation path, so bound abuse and alert on a spike. */
const MAX_NEW_LEADS_PER_POLL = 30;

function splitName(name: string | null): { firstName: string | null; lastName: string | null } {
  const n = (name ?? '').trim();
  if (!n) return { firstName: null, lastName: null };
  const parts = n.split(/\s+/);
  return { firstName: parts[0] ?? null, lastName: parts.slice(1).join(' ') || null };
}

function objectMeta(v: Prisma.JsonValue | null): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Link the message to the lead's card: provenance, recency bump, enroll. */
async function attachToBoard(lead: Lead, parsed: ParsedInbound): Promise<void> {
  try {
    const meta = objectMeta(lead.metadata);
    meta.inboundEmail = {
      lastSubject: parsed.subject,
      lastReceivedAt: parsed.receivedAt.toISOString(),
      gmailThreadId: parsed.gmailThreadId,
      lastFrom: parsed.fromEmail,
    };
    const upgradeWidget = lead.sourceWidget === null || lead.sourceWidget === 'OTHER';
    // Recency drives needsResponse + the summary chip. Only ever move it
    // FORWARD — a stale email must not un-freshen a lead that has newer activity.
    const bumpActivity = lead.lastActivityAt == null || parsed.receivedAt > lead.lastActivityAt;
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: meta as never,
        ...(upgradeWidget ? { sourceWidget: 'INBOUND_EMAIL' } : {}),
        ...(bumpActivity ? { lastActivityAt: parsed.receivedAt } : {}),
      },
    });

    // Explicit act ⇒ column card. Guarded: promotes PARTIAL/ANONYMOUS to a card,
    // never downgrades SUBMITTED/CONVERTED and never reopens WON/LOST.
    if (lead.status === 'PARTIAL' || lead.status === 'ANONYMOUS') {
      await markLeadStatus(lead.id, 'SUBMITTED');
    } else {
      await enrollLeadIfEligible(lead.id);
    }
  } catch (err) {
    console.warn('[inbound-email] board attach failed', safeErrorMessage(err));
  }
}

export interface IngestResult {
  created: boolean;
  leadId: string | null;
}

/**
 * Persist one inbound email and attach it to its lead card. Idempotent: a Gmail
 * message id we already stored is a no-op.
 */
export async function ingestInboundEmail(parsed: ParsedInbound): Promise<IngestResult> {
  const existing = await prisma.inboundEmail.findUnique({
    where: { gmailMessageId: parsed.gmailMessageId },
    select: { leadId: true },
  });
  if (existing) return { created: false, leadId: existing.leadId };

  const { firstName, lastName } = splitName(parsed.fromName);
  const lead = await upsertLead(
    { email: parsed.fromEmail, firstName, lastName },
    { sourcePage: `email:${inboundMailbox()}`, sourceWidget: 'INBOUND_EMAIL' },
  );

  try {
    await prisma.inboundEmail.create({
      data: {
        gmailMessageId: parsed.gmailMessageId,
        gmailThreadId: parsed.gmailThreadId,
        leadId: lead?.id ?? null,
        fromEmail: parsed.fromEmail,
        fromName: parsed.fromName,
        toAddress: parsed.toAddress,
        subject: parsed.subject,
        snippet: parsed.snippet,
        bodyText: parsed.bodyText,
        receivedAt: parsed.receivedAt,
        metadata: { headers: parsed.headers } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { created: false, leadId: lead?.id ?? null }; // raced
    throw err;
  }

  if (lead) await attachToBoard(lead, parsed);
  return { created: true, leadId: lead?.id ?? null };
}

export interface PollResult {
  configured: boolean;
  scanned: number;
  ingested: number;
  skippedNoise: number;
  skippedDup: number;
  errors: number;
}

/**
 * Poll the mailbox INBOX for recent mail and ingest the likely-inquiry ones.
 * No-ops (configured:false) until the Gmail service account + domain-wide
 * delegation are set up. Safe to run on an interval — dedupes by message id.
 */
export async function pollInboundEmails(opts?: {
  windowDays?: number;
  maxMessages?: number;
}): Promise<PollResult> {
  const result: PollResult = {
    configured: false,
    scanned: 0,
    ingested: 0,
    skippedNoise: 0,
    skippedDup: 0,
    errors: 0,
  };
  if (!isGmailInboundConfigured()) return result;
  const gmail = getGmailClient();
  if (!gmail) return result;
  result.configured = true;

  const windowDays = opts?.windowDays ?? 2;
  const list = await gmail.users.messages.list({
    userId: 'me',
    q: `in:inbox newer_than:${windowDays}d`,
    maxResults: opts?.maxMessages ?? 50,
  });
  const ids = (list.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id));
  result.scanned = ids.length;

  for (const id of ids) {
    try {
      const seen = await prisma.inboundEmail.findUnique({
        where: { gmailMessageId: id },
        select: { id: true },
      });
      if (seen) {
        result.skippedDup++;
        continue;
      }
      const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const parsed = parseGmailMessage(full.data);
      if (!parsed) {
        result.errors++;
        continue;
      }
      const decision = shouldIngestInbound(parsed);
      if (!decision.ingest) {
        result.skippedNoise++;
        // Domain only — never the full sender address (PII) at INFO level.
        console.log('[inbound-email] skipped', decision.reason, parsed.fromEmail.split('@')[1] ?? '');
        continue;
      }
      const res = await ingestInboundEmail(parsed);
      if (res.created) {
        result.ingested++;
        if (result.ingested >= MAX_NEW_LEADS_PER_POLL) {
          console.warn(
            `[inbound-email] hit new-lead cap (${MAX_NEW_LEADS_PER_POLL}) this poll — possible spike; stopping`,
          );
          break;
        }
      } else {
        result.skippedDup++;
      }
    } catch (err) {
      result.errors++;
      console.warn('[inbound-email] message failed', id, safeErrorMessage(err));
    }
  }
  return result;
}
