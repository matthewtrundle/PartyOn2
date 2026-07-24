'use client';

import { ReactElement, useState } from 'react';
import HqBadge, { type HqBadgeVariant } from '@/components/backend/kit/Badge';
import type { LeadDetail } from './drawer-types';

interface TimelineEntry {
  at: string;
  kind: 'event' | 'email' | 'followup' | 'inbound';
  label: string;
  detail?: string | null;
  /** Email entries only: lets the row expand to fetch the sent body. */
  emailLogId?: string;
  /** Email entries only: bounce/failure reason, shown inline. */
  errorMessage?: string | null;
}

/** Badge style + label per timeline entry kind. */
const KIND_BADGE: Record<TimelineEntry['kind'], { variant: HqBadgeVariant; label: string }> = {
  event: { variant: 'gray', label: 'site' },
  email: { variant: 'blue', label: 'email' },
  followup: { variant: 'amber', label: 'followup' },
  inbound: { variant: 'green', label: 'inbox' },
};

function eventLabel(e: LeadDetail['events'][number]): string {
  const meta = (e.metadata ?? {}) as Record<string, unknown>;
  if (meta.kind === 'stage.changed') {
    return `Stage: ${meta.from ?? 'off board'} → ${meta.to} (${meta.via})`;
  }
  if (meta.kind === 'email.reply') return `Replied by email: "${meta.subject}"`;
  if (meta.kind === 'outreach.logged') {
    return `Logged ${meta.channel === 'call' ? 'a call' : meta.channel === 'text' ? 'a text' : 'outreach'}`;
  }
  switch (e.type) {
    case 'FORM_SUBMIT':
      return `Submitted a form${e.widget ? ` (${e.widget})` : ''}`;
    case 'CHECKOUT_START':
      return 'Started checkout / asked for a quote';
    case 'FIELD_BLUR':
      return `Typed ${e.fieldName ?? 'a field'}`;
    case 'PAGE_VIEW':
      return `Viewed ${e.page ?? 'a page'}`;
    case 'CART_ADD':
      return 'Added to cart';
    case 'CONVERSION':
      return 'Converted (payment confirmed)';
    case 'STEP_COMPLETE':
      return `Completed a step${e.widget ? ` (${e.widget})` : ''}`;
    default:
      return e.type;
  }
}

interface FetchedBody {
  loading: boolean;
  html?: string | null;
  text?: string | null;
  errorMessage?: string | null;
  bodyError?: string;
}

/** Merge LeadEvents + EmailLogs + FollowUpJobs into one descending feed. */
export default function DrawerTimeline({ detail }: { detail: LeadDetail }): ReactElement {
  const [openId, setOpenId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, FetchedBody>>({});

  const toggleEmail = async (emailLogId: string): Promise<void> => {
    if (openId === emailLogId) {
      setOpenId(null);
      return;
    }
    setOpenId(emailLogId);
    if (bodies[emailLogId]) return; // already fetched
    setBodies((b) => ({ ...b, [emailLogId]: { loading: true } }));
    try {
      const res = await fetch(`/api/v1/admin/leads/email/${emailLogId}`);
      const json = await res.json();
      setBodies((b) => ({ ...b, [emailLogId]: { loading: false, ...(json.data ?? {}) } }));
    } catch {
      setBodies((b) => ({ ...b, [emailLogId]: { loading: false, bodyError: 'unavailable' } }));
    }
  };

  const entries: TimelineEntry[] = [
    ...detail.events.map((e) => ({
      at: e.occurredAt,
      kind: 'event' as const,
      label: eventLabel(e),
      detail: e.page,
    })),
    ...detail.emailLogs.map((l) => ({
      at: l.createdAt,
      kind: 'email' as const,
      label: `Email ${l.status.toLowerCase()}: "${l.subject}"`,
      detail: l.type,
      emailLogId: l.id,
      errorMessage: l.errorMessage,
    })),
    ...detail.followUps.map((f) => ({
      at: f.sentAt ?? f.scheduledFor,
      kind: 'followup' as const,
      label:
        f.status === 'scheduled'
          ? `Follow-up queued: ${f.journeyKey} step ${f.step}`
          : `Follow-up ${f.status}: ${f.journeyKey} step ${f.step}${f.cancelReason ? ` (${f.cancelReason})` : ''}`,
    })),
    ...detail.inboundEmails.map((m) => ({
      at: m.receivedAt,
      kind: 'inbound' as const,
      label: `Emailed us${m.subject ? `: "${m.subject}"` : ''}`,
      detail: m.snippet,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {entries.slice(0, 60).map((entry, i) => {
        const expandable = entry.kind === 'email' && Boolean(entry.emailLogId);
        const isOpen = expandable && openId === entry.emailLogId;
        const body = entry.emailLogId ? bodies[entry.emailLogId] : undefined;
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <HqBadge variant={KIND_BADGE[entry.kind].variant} className="mt-[1px] shrink-0">
              {KIND_BADGE[entry.kind].label}
            </HqBadge>
            <div className="min-w-0 flex-1">
              {expandable ? (
                <button
                  type="button"
                  onClick={() => void toggleEmail(entry.emailLogId as string)}
                  className="text-left text-gray-800 hover:text-brand-blue inline-flex items-center gap-1"
                >
                  <span>{entry.label}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              ) : (
                <div className="text-gray-800">{entry.label}</div>
              )}
              <div className="text-sm text-gray-400">
                {new Date(entry.at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'America/Chicago',
                })}
                {entry.detail ? ` · ${entry.detail}` : ''}
              </div>
              {/* Bounce reason is always worth showing on a failed email. */}
              {entry.errorMessage && (
                <div className="mt-1 text-xs text-red-600">Reason: {entry.errorMessage}</div>
              )}
              {isOpen && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  {body?.loading && <div className="text-sm text-gray-400">Loading email…</div>}
                  {body && !body.loading && body.html && (
                    // Sandboxed: no scripts, no same-origin — safe to render our
                    // own template HTML (which interpolates customer fields).
                    <iframe
                      sandbox=""
                      srcDoc={body.html}
                      title="Sent email"
                      className="h-96 w-full rounded border border-gray-200 bg-white"
                    />
                  )}
                  {body && !body.loading && !body.html && body.text && (
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-gray-700">
                      {body.text}
                    </pre>
                  )}
                  {body && !body.loading && !body.html && !body.text && (
                    <div className="text-sm text-gray-400">
                      Body isn&apos;t available for this email (not retained by the mail
                      provider).
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
