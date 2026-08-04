'use client';

import { ReactElement, useCallback, useState } from 'react';
import KPITile from '@/components/backend/kit/KPITile';
import HqBadge from '@/components/backend/kit/Badge';
import { CHANNEL_LABELS } from '@/lib/leads/source-taxonomy';
import type { SourcesReport } from '@/lib/leads/sources-report';

/**
 * "Where leads come from" — real people per form, not board rows.
 *
 * Collapsed by default and fetched only on first open. The board GET is
 * already expensive (it runs the enrol sweep and reads 500 leads), so this
 * must never load alongside it.
 */
export default function SourcesPanel({
  onPickForm,
  activeForm,
}: {
  onPickForm: (formKey: string | undefined) => void;
  activeForm?: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<SourcesReport | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/v1/admin/leads/sources');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error('load failed');
      setReport(json.data as SourcesReport);
      setState('idle');
    } catch {
      setState('failed');
    }
  }, []);

  const toggle = (): void => {
    const next = !open;
    setOpen(next);
    if (next && !report && state !== 'loading') void load();
  };

  const totalPeople = report?.totals.people ?? 0;
  const topChannel = report?.channels[0];
  const paid = report?.channels.find((c) => c.channel === 'paid');
  const wonTotal = report?.forms.reduce((sum, f) => sum + f.won, 0) ?? 0;

  return (
    <section className="card p-0 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-700">
            Where leads come from
          </span>
          <span className="text-sm text-gray-500">
            {report ? `${totalPeople} people` : 'real people per form'}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-200 p-4 flex flex-col gap-4">
          {state === 'loading' && <p className="text-sm text-gray-500">Counting…</p>}
          {state === 'failed' && (
            <p className="text-sm text-red-700">
              Could not load the sources report.{' '}
              <button type="button" onClick={() => void load()} className="underline">
                Try again
              </button>
            </p>
          )}

          {report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPITile
                  label="Real people"
                  value={String(totalPeople)}
                  delta={`${report.totals.leadRows} rows`}
                />
                <KPITile
                  label="Top channel"
                  value={topChannel ? CHANNEL_LABELS[topChannel.channel] : '—'}
                  delta={topChannel ? `${topChannel.people} people` : undefined}
                />
                <KPITile
                  label="From paid ads"
                  value={String(paid?.people ?? 0)}
                  delta={paid ? `${paid.ordered} ordered` : 'none'}
                  deltaTone={paid && paid.ordered === 0 && paid.people > 0 ? 'red' : 'gray'}
                />
                <KPITile label="Won" value={String(wonTotal)} />
              </div>

              <p className="text-sm text-gray-600">
                {report.totals.fragmentsCollapsed} duplicate rows merged;{' '}
                {report.totals.unreachableRows} rows have no email or phone;{' '}
                {report.totals.outboundRows} are our own outreach and are excluded.
                People is an upper bound — addresses saved mid-typing only merge
                when one is a prefix of the other.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1.5 pr-3 font-semibold">Form</th>
                      <th className="py-1.5 pr-3 font-semibold">Channel</th>
                      <th className="py-1.5 pr-3 font-semibold text-right">People</th>
                      <th className="py-1.5 pr-3 font-semibold text-right">Open</th>
                      <th className="py-1.5 pr-3 font-semibold text-right">Won</th>
                      <th className="py-1.5 font-semibold text-right">Ordered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.forms.map((f) => {
                      const isActive = activeForm === f.key;
                      return (
                        <tr
                          key={f.key}
                          className={`border-t border-gray-100 ${isActive ? 'bg-brand-blue/5' : ''}`}
                        >
                          <td className="py-1.5 pr-3">
                            <button
                              type="button"
                              onClick={() => onPickForm(isActive ? undefined : f.key)}
                              className="text-left text-brand-blue hover:underline min-h-[36px]"
                            >
                              {f.label}
                            </button>
                          </td>
                          <td className="py-1.5 pr-3">
                            <HqBadge variant="gray">{CHANNEL_LABELS[f.channel]}</HqBadge>
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f.people}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f.open}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f.won}</td>
                          <td className="py-1.5 text-right tabular-nums">{f.ordered}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
