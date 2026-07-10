'use client';

import { ReactElement, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import KPITile from '@/components/backend/kit/KPITile';
import TriageRow from '@/components/backend/kit/TriageRow';
import HqBadge, { type HqBadgeVariant } from '@/components/backend/kit/Badge';
import SkeletonCard from '@/components/backend/kit/SkeletonCard';
import type { TodayData } from '@/lib/ops/today-data';

const SEVERITY_BADGE: Record<string, HqBadgeVariant> = {
  red: 'red',
  amber: 'amber',
  blue: 'blue',
};

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Chicago',
    }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * /ops/today — the "Shift Board": what needs me in the next 5 seconds.
 * KPI grid → quick actions → triage queue → today's runs. Data comes from
 * one aggregate call (GET /api/ops/today) so the screen paints in a single
 * round trip; skeletons mirror the final layout.
 */
export default function TodayPage(): ReactElement {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback((): void => {
    fetch('/api/ops/today')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((body) => {
        if (body?.success) {
          setData(body.data);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const eyebrow = new Date()
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Chicago',
    })
    .toUpperCase()
    .replace(',', ' ·');

  const k = data?.kpis;

  return (
    <div className="min-h-screen bg-gray-50" style={{ overscrollBehaviorY: 'contain' }}>
      {/* Navy header band */}
      <div className="bg-navy text-white px-4 pt-2 pb-5 md:px-8">
        <div className="max-w-5xl mx-auto flex items-end justify-between gap-3">
          <div>
            <div className="font-heading font-semibold text-xs tracking-[0.18em] text-gold">
              {eyebrow}
            </div>
            <h1 className="font-heading font-bold text-2xl tracking-[0.08em] uppercase mt-0.5">
              {greeting()}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setData(null);
              load();
            }}
            aria-label="Refresh"
            className="w-10 h-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 md:px-8 max-w-5xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            Couldn&apos;t load the board.{' '}
            <button type="button" onClick={load} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* KPI grid */}
        {k ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <KPITile
              label="Booked today"
              value={fmtMoney(k.revenueToday)}
              delta={
                k.revenueDeltaPct === null
                  ? `${k.ordersBookedToday} order${k.ordersBookedToday === 1 ? '' : 's'}`
                  : `${k.revenueDeltaPct >= 0 ? '▲' : '▼'} ${Math.abs(k.revenueDeltaPct).toFixed(0)}% vs last ${new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' })}`
              }
              deltaTone={
                k.revenueDeltaPct === null ? 'gray' : k.revenueDeltaPct >= 0 ? 'green' : 'red'
              }
            />
            <KPITile
              label="Deliveries"
              value={`${k.deliveriesDone}/${k.deliveriesTotal}`}
              delta={k.nextRunTime ? `next ${k.nextRunTime}` : k.deliveriesTotal > 0 ? 'all done' : 'none today'}
              deltaTone={k.deliveriesTotal > 0 && k.deliveriesDone === k.deliveriesTotal ? 'green' : 'gray'}
            />
            <KPITile
              label="Alerts"
              value={String(k.alertsCount)}
              valueTone={k.alertsCount > 0 ? 'red' : 'default'}
              delta={k.alertsBreakdown}
              deltaTone={k.alertsCount > 0 ? 'red' : 'green'}
            />
            <KPITile
              label="Unpaid carts (30d)"
              value={fmtMoney(k.unpaidCartTotal)}
              delta={`${k.unpaidCartCount} open · ${k.staleCartCount} >24h`}
              deltaTone={k.staleCartCount > 0 ? 'red' : 'gray'}
            />
          </div>
        ) : (
          !error && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <SkeletonCard variant="tile" />
              <SkeletonCard variant="tile" />
              <SkeletonCard variant="tile" />
              <SkeletonCard variant="tile" />
            </div>
          )
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/ops/orders/create"
            className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-brand-yellow text-gray-900 font-heading font-bold text-[13px] tracking-[0.08em] uppercase hover:bg-yellow-400 transition-colors"
          >
            ＋ Invoice
          </Link>
          <Link
            href="/admin/customers"
            className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 font-heading font-bold text-[13px] tracking-[0.08em] uppercase hover:bg-gray-50 transition-colors"
          >
            Customer
          </Link>
          <Link
            href="/ops/inventory"
            className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 font-heading font-bold text-[13px] tracking-[0.08em] uppercase hover:bg-gray-50 transition-colors"
          >
            Stock
          </Link>
        </div>

        {/* Needs attention */}
        {data ? (
          data.triage.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-[14px]">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  <path strokeLinecap="round" d="M12 17.25h.007" />
                </svg>
                <h2 className="font-heading font-bold text-base tracking-[0.08em] uppercase text-gray-900">
                  Needs attention
                </h2>
              </div>
              {data.triage.map((t) => (
                <TriageRow
                  key={t.key}
                  badge={<HqBadge variant={SEVERITY_BADGE[t.severity]}>{t.badge}</HqBadge>}
                  title={t.title}
                  actionLabel={t.actionLabel}
                  actionHref={t.href}
                />
              ))}
            </div>
          )
        ) : (
          !error && <SkeletonCard rows={3} />
        )}

        {/* Today's runs */}
        {data ? (
          <div className="bg-white rounded-xl border border-gray-200 p-[14px]">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading font-bold text-base tracking-[0.08em] uppercase text-gray-900">
                Today&apos;s runs
              </h2>
              <Link href="/ops/orders" className="text-sm font-semibold text-brand-blue">
                All orders →
              </Link>
            </div>
            {data.runs.length === 0 ? (
              <p className="text-sm text-gray-500 py-3">No deliveries today.</p>
            ) : (
              data.runs.map((r, i) => (
                <Link
                  key={`${r.orderNumber ?? i}-${r.time}`}
                  href={r.href}
                  className="flex items-center gap-3 min-h-[52px] py-2 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="w-[58px] shrink-0 font-heading font-bold text-base text-brand-blue leading-tight">
                    {r.time || '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {r.name}
                      {r.orderNumber !== null && (
                        <span className="text-gray-400 font-normal"> · #{r.orderNumber}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{r.context}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {r.flags.map((f) => (
                      <HqBadge
                        key={f}
                        variant={f === 'DONE' ? 'solid-green' : f === 'XL' ? 'brand' : 'blue'}
                      >
                        {f}
                      </HqBadge>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          !error && <SkeletonCard rows={4} />
        )}
      </div>
    </div>
  );
}
