'use client';

/**
 * Collapsible campaign-funnel panel on the prospects workbench. Journey-wide
 * (all verticals — same precedent as the metrics strip). Collapsed: one
 * summary line + state badges. Expanded: funnel tiles, per-touch table, the
 * A/B results panel, delivery problems (real emails — same page/auth/audience
 * as the table that already shows them), and the scheduled queue.
 * Data: GET /api/v1/admin/partner-prospects/campaign.
 */

import { useState, type ReactElement } from 'react';
import HqBadge from '@/components/backend/kit/Badge';
import { rateLabel } from '@/lib/partners/campaign-stats';
import ProspectsAbPanel, { type AbResults } from './ProspectsAbPanel';
import { Stat } from './ProspectsMetricsStrip';

interface ProspectRef {
  id: string;
  name: string;
  vertical: string;
  websiteKey: string;
}

interface TouchStat {
  step: number;
  sent: number;
  opened: number;
  replies: number;
  endedGood: number;
  canceledOther: number;
  failed: number;
  suppressed: number;
  scheduled: number;
}

interface ProblemRow {
  kind: 'bounced' | 'failed' | 'suppressed';
  step: number;
  email: string;
  reason: string;
  at: string;
  prospect: ProspectRef | null;
}

interface QueueRow {
  step: number;
  email: string;
  status: string;
  scheduledFor: string | null;
  prospect: ProspectRef | null;
}

export interface CampaignOverviewData {
  funnel: { enrolled: number; sent: number; opened: number; replied: number };
  touches: TouchStat[];
  problems: ProblemRow[];
  queue: QueueRow[];
  capToday: { used: number; cap: number };
  flagOn: boolean;
  smallSample: boolean;
  note: string | null;
}

export type DrillHandler = (websiteKey: string, vertical: string) => void;

const KIND_BADGE: Record<ProblemRow['kind'], 'red' | 'amber' | 'gray'> = {
  bounced: 'red',
  failed: 'amber',
  suppressed: 'gray',
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

function ProspectCell({
  prospect,
  email,
  onDrill,
}: {
  prospect: ProspectRef | null;
  email: string;
  onDrill: DrillHandler;
}): ReactElement {
  if (!prospect) return <span className="text-gray-500">{email}</span>;
  return (
    <button
      type="button"
      onClick={() => onDrill(prospect.websiteKey, prospect.vertical)}
      className="text-left text-brand-blue underline"
      title="Open this prospect"
    >
      {prospect.name}
      <HqBadge variant="gray" className="ml-1.5 normal-case">
        {prospect.vertical}
      </HqBadge>
    </button>
  );
}

function TouchTable({ touches }: { touches: TouchStat[] }): ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-semibold">Touch</th>
            <th className="py-2 pr-4 font-semibold">Sent</th>
            <th className="py-2 pr-4 font-semibold">Opened</th>
            <th
              className="py-2 pr-4 font-semibold"
              title="Attributed to the last touch sent before the prospect's first reply — an approximation"
            >
              Replies*
            </th>
            <th className="py-2 pr-4 font-semibold">Ended (good)</th>
            <th className="py-2 pr-4 font-semibold">Canceled</th>
            <th className="py-2 pr-4 font-semibold">Failed</th>
            <th className="py-2 pr-4 font-semibold">Suppressed</th>
            <th className="py-2 font-semibold">Queued</th>
          </tr>
        </thead>
        <tbody>
          {touches.map((t) => (
            <tr key={t.step} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-semibold text-gray-900">Touch {t.step}</td>
              <td className="py-2 pr-4 text-gray-700">{t.sent}</td>
              <td className="py-2 pr-4 text-gray-700">{t.opened}</td>
              <td className="py-2 pr-4 text-gray-700">{t.replies}</td>
              <td className="py-2 pr-4 text-green-700">{t.endedGood}</td>
              <td className="py-2 pr-4 text-gray-700">{t.canceledOther}</td>
              <td className="py-2 pr-4 text-gray-700">{t.failed}</td>
              <td className="py-2 pr-4 text-gray-700">{t.suppressed}</td>
              <td className="py-2 text-gray-700">{t.scheduled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProblemsTable({
  problems,
  onDrill,
}: {
  problems: ProblemRow[];
  onDrill: DrillHandler;
}): ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-semibold">Prospect</th>
            <th className="py-2 pr-4 font-semibold">Email</th>
            <th className="py-2 pr-4 font-semibold">Touch</th>
            <th className="py-2 pr-4 font-semibold">Problem</th>
            <th className="py-2 pr-4 font-semibold">Reason</th>
            <th className="py-2 font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p, i) => (
            <tr key={`${p.email}-${p.step}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4">
                <ProspectCell prospect={p.prospect} email={p.email} onDrill={onDrill} />
              </td>
              <td className="py-2 pr-4 text-gray-700">{p.email}</td>
              <td className="py-2 pr-4 text-gray-700">{p.step}</td>
              <td className="py-2 pr-4">
                <HqBadge variant={KIND_BADGE[p.kind]}>{p.kind}</HqBadge>
              </td>
              <td className="py-2 pr-4 text-gray-700 max-w-[320px] truncate" title={p.reason}>
                {p.reason}
              </td>
              <td className="py-2 text-gray-700 whitespace-nowrap">{ct(p.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueueTable({
  queue,
  onDrill,
}: {
  queue: QueueRow[];
  onDrill: DrillHandler;
}): ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-semibold">Sends</th>
            <th className="py-2 pr-4 font-semibold">Prospect</th>
            <th className="py-2 pr-4 font-semibold">Touch</th>
            <th className="py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((q, i) => (
            <tr key={`${q.email}-${q.step}-${i}`} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                {q.scheduledFor ? ct(q.scheduledFor) : '—'}
              </td>
              <td className="py-2 pr-4">
                <ProspectCell prospect={q.prospect} email={q.email} onDrill={onDrill} />
              </td>
              <td className="py-2 pr-4 text-gray-700">{q.step}</td>
              <td className="py-2 text-gray-700">{q.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProspectsCampaignPanel({
  data,
  ab,
  onDrill,
}: {
  data: CampaignOverviewData | null;
  ab: AbResults | null;
  onDrill: DrillHandler;
}): ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;
  const { funnel } = data;

  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 flex-wrap p-3 text-left"
      >
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold uppercase tracking-wider text-gray-700">
            Campaign funnel
          </span>
          <span className="text-sm text-gray-700">
            {funnel.enrolled} enrolled → {funnel.sent} sent → {funnel.opened} opened →{' '}
            {funnel.replied} replied
          </span>
        </span>
        <span className="flex items-center gap-2">
          {!data.flagOn && <HqBadge variant="amber">Sends held</HqBadge>}
          {data.smallSample && <HqBadge variant="gray">Directional</HqBadge>}
          {data.problems.length > 0 && (
            <HqBadge variant="red">
              {data.problems.length} problem{data.problems.length === 1 ? '' : 's'}
            </HqBadge>
          )}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Stat label="Enrolled" value={String(funnel.enrolled)} />
            <Stat
              label="Sent"
              value={String(funnel.sent)}
              sub={rateLabel(funnel.sent, funnel.enrolled)}
            />
            <Stat
              label="Opened"
              value={String(funnel.opened)}
              sub={rateLabel(funnel.opened, funnel.sent)}
            />
            <Stat
              label="Replied"
              value={String(funnel.replied)}
              sub={rateLabel(funnel.replied, funnel.sent)}
            />
          </div>
          {data.note && <p className="text-sm text-gray-600">{data.note}</p>}

          <TouchTable touches={data.touches} />

          <ProspectsAbPanel data={ab} />

          {data.problems.length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">
                Delivery problems
              </h4>
              <ProblemsTable problems={data.problems} onDrill={onDrill} />
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">
              Scheduled queue
            </h4>
            {data.queue.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing queued.</p>
            ) : (
              <QueueTable queue={data.queue} onDrill={onDrill} />
            )}
            <p className="text-sm text-gray-600 mt-2">
              Cap today {data.capToday.used}/{data.capToday.cap}
              {!data.flagOn && (
                <span className="text-amber-800">
                  {' '}
                  · Sends held — the partner-outreach flag is off; queued times shift once it turns
                  on.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
