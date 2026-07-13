'use client';

import { ReactElement } from 'react';
import HqBadge from '@/components/backend/kit/Badge';
import type { LeadDetail } from './drawer-types';

interface TimelineEntry {
  at: string;
  kind: 'event' | 'email' | 'followup';
  label: string;
  detail?: string | null;
}

function eventLabel(e: LeadDetail['events'][number]): string {
  const meta = (e.metadata ?? {}) as Record<string, unknown>;
  if (meta.kind === 'stage.changed') {
    return `Stage: ${meta.from ?? 'off board'} → ${meta.to} (${meta.via})`;
  }
  if (meta.kind === 'email.reply') return `Replied by email: "${meta.subject}"`;
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

/** Merge LeadEvents + EmailLogs + FollowUpJobs into one descending feed. */
export default function DrawerTimeline({ detail }: { detail: LeadDetail }): ReactElement {
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
    })),
    ...detail.followUps.map((f) => ({
      at: f.sentAt ?? f.scheduledFor,
      kind: 'followup' as const,
      label:
        f.status === 'scheduled'
          ? `Follow-up queued: ${f.journeyKey} step ${f.step}`
          : `Follow-up ${f.status}: ${f.journeyKey} step ${f.step}${f.cancelReason ? ` (${f.cancelReason})` : ''}`,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {entries.slice(0, 60).map((entry, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <HqBadge
            variant={entry.kind === 'email' ? 'blue' : entry.kind === 'followup' ? 'amber' : 'gray'}
            className="mt-[1px] shrink-0"
          >
            {entry.kind === 'event' ? 'site' : entry.kind}
          </HqBadge>
          <div className="min-w-0">
            <div className="text-gray-800">{entry.label}</div>
            <div className="text-xs text-gray-400">
              {new Date(entry.at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/Chicago',
              })}
              {entry.detail ? ` · ${entry.detail}` : ''}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
