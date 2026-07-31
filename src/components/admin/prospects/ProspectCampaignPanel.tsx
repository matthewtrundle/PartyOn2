'use client';

/**
 * Drawer campaign timeline — what actually happened after Enroll, one row
 * per touch: job status, send/sent time, open state, bounce reason, cancel
 * reason. Data: GET /api/v1/admin/partner-prospects/[id]/campaign (lazy,
 * fetched only when the drawer opens). Touches with no job yet (the engine
 * enqueues step N+1 only after step N sends) render as "queued".
 */

import { useEffect, useState, type ReactElement } from 'react';
import HqBadge, { type HqBadgeVariant } from '@/components/backend/kit/Badge';
import { STATUS_CHIP } from '@/components/admin/followups/SentLogPanel';

interface TouchEmail {
  status: string;
  openedAt: string | null;
  bouncedAt: string | null;
  errorMessage: string | null;
}

interface Touch {
  step: number;
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  cancelReason: string | null;
  lastError: string | null;
  email: TouchEmail | null;
}

interface CampaignData {
  enrolled: boolean;
  leadId: string | null;
  touches: Touch[];
}

const TOUCH_LABELS: Record<number, string> = {
  1: 'Touch 1 — intro',
  2: 'Touch 2 — bump (+5d)',
  3: 'Touch 3 — close (+12d)',
};

const JOB_BADGE: Record<string, HqBadgeVariant> = {
  scheduled: 'blue',
  processing: 'amber',
  sent: 'green',
  canceled: 'gray',
  suppressed: 'red',
  failed: 'red',
  pending: 'gray',
};

function ct(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function TouchRow({ touch }: { touch: Touch }): ReactElement {
  const bounced = touch.email?.bouncedAt != null;
  return (
    <div className="border-b border-gray-100 last:border-b-0 py-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {TOUCH_LABELS[touch.step] ?? `Touch ${touch.step}`}
        </span>
        <HqBadge variant={JOB_BADGE[touch.status] ?? 'gray'}>
          {touch.status === 'pending' ? 'queued' : touch.status}
        </HqBadge>
        {touch.email && (
          <span
            className={`inline-block text-xs border rounded px-1.5 py-0.5 ${
              STATUS_CHIP[touch.email.status] ?? STATUS_CHIP.PENDING
            }`}
          >
            {touch.email.status}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700">
        {touch.status === 'pending' ? (
          <span className="text-gray-500">Queued after touch {touch.step - 1} sends.</span>
        ) : touch.status === 'sent' && touch.sentAt ? (
          <>
            Sent {ct(touch.sentAt)}
            {touch.email?.openedAt ? (
              <> · Opened {ct(touch.email.openedAt)}</>
            ) : (
              !bounced && <span className="text-gray-500"> · Not opened</span>
            )}
          </>
        ) : touch.scheduledFor ? (
          <>Sends {ct(touch.scheduledFor)}</>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </p>
      {bounced && (
        <p className="text-sm text-red-700">
          Bounced — Reason: {touch.email?.errorMessage ?? 'not recorded'}
        </p>
      )}
      {touch.cancelReason && (
        <p className="text-sm text-gray-500">Canceled: {touch.cancelReason}</p>
      )}
      {touch.lastError && <p className="text-sm text-red-700">Error: {touch.lastError}</p>}
    </div>
  );
}

export default function ProspectCampaignPanel({
  prospectId,
  leadId,
}: {
  prospectId: string;
  leadId: string;
}): ReactElement {
  const [data, setData] = useState<CampaignData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stale = false;
    setData(null);
    setError(false);
    fetch(`/api/v1/admin/partner-prospects/${prospectId}/campaign`)
      .then((res) => res.json())
      .then((json) => {
        if (stale) return;
        if (json.success) setData(json.data as CampaignData);
        else setError(true);
      })
      .catch(() => {
        if (!stale) setError(true);
      });
    return () => {
      stale = true;
    };
  }, [prospectId]);

  return (
    <div className="card space-y-2">
      <h3 className="text-lg font-bold text-gray-900">Campaign — 3 touches</h3>
      {error ? (
        <p className="text-sm text-red-700">Couldn’t load campaign status.</p>
      ) : !data ? (
        <p className="text-sm text-gray-500">Loading campaign…</p>
      ) : !data.enrolled ? (
        <p className="text-sm text-gray-500">Not enrolled in the campaign yet.</p>
      ) : (
        <div>
          {data.touches.map((t) => (
            <TouchRow key={t.step} touch={t} />
          ))}
        </div>
      )}
      <a
        href={`/admin/leads?lead=${encodeURIComponent(leadId)}`}
        className="inline-block text-sm text-brand-blue underline"
      >
        Full lead timeline →
      </a>
    </div>
  );
}
