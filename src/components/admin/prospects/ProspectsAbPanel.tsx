'use client';

/**
 * First-touch A/B results strip: per-arm reply rate (the win metric) with the
 * short-vs-detailed split, from GET /api/v1/admin/partner-prospects/ab. Shows
 * the assignment split before any sends and stays honest about significance —
 * it renders directional rates + a "not enough data" note rather than implying
 * a call the small sample can't support. Hidden entirely when no prospect is
 * assigned to an arm (no test running).
 */

import type { ReactElement } from 'react';

interface ArmStat {
  arm: 'A' | 'B';
  label: 'short' | 'detailed';
  sent: number;
  opened: number;
  replied: number;
  replyRate: number;
  openRate: number;
}

export interface AbResults {
  experimentKey: string | null;
  assigned: { A: number; B: number };
  arms: ArmStat[];
  callable: boolean;
  note: string;
}

const ARM_CLS: Record<'A' | 'B', string> = {
  A: 'border-fuchsia-200 bg-fuchsia-50', // off the VERIFIED-chip teal (see ARM_CHIP)
  B: 'border-indigo-200 bg-indigo-50',
};

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

function ArmCard({ arm, assigned }: { arm: ArmStat; assigned: number }): ReactElement {
  return (
    <div className={`rounded-lg border px-3 py-2 min-w-[150px] ${ARM_CLS[arm.arm]}`}>
      <div className="text-xs uppercase tracking-wider text-gray-600">
        {arm.arm} · {arm.label}
      </div>
      <div className="text-lg font-bold text-gray-900">
        {arm.sent > 0 ? pct(arm.replyRate) : '—'}{' '}
        <span className="text-sm font-normal text-gray-600">reply rate</span>
      </div>
      <div className="text-sm text-gray-700">
        {arm.replied}/{arm.sent} replied · {arm.sent > 0 ? pct(arm.openRate) : '—'} opened
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
        {assigned} assigned · {arm.sent} sent
      </div>
    </div>
  );
}

export default function ProspectsAbPanel({ data }: { data: AbResults | null }): ReactElement | null {
  if (!data) return null;
  if (data.assigned.A + data.assigned.B === 0) return null; // no test running

  const armA = data.arms.find((a) => a.arm === 'A');
  const armB = data.arms.find((a) => a.arm === 'B');
  if (!armA || !armB) return null;

  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          First-touch A/B — reply rate
          {data.experimentKey ? (
            <span className="ml-2 font-normal normal-case text-gray-500">{data.experimentKey}</span>
          ) : null}
        </h3>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            data.callable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {data.callable ? 'Winner called' : 'Directional'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <ArmCard arm={armA} assigned={data.assigned.A} />
        <ArmCard arm={armB} assigned={data.assigned.B} />
      </div>
      <p className="text-sm text-gray-600 mt-2">{data.note}</p>
    </div>
  );
}
