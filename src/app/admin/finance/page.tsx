'use client';

import { useEffect, useState, ReactElement } from 'react';
import Link from 'next/link';

interface PlSnapshotPayload {
  date: string;
  windowFromIso: string;
  windowToIso: string;
  paidOrderCount: number;
  refundCount: number;
  grossRevenueCents: number;
  subtotalCents: number;
  taxCollectedCents: number;
  deliveryFeesCents: number;
  tipsCents: number;
  discountAmountCents: number;
  refundedAmountCents: number;
  cogsCents: number;
  marginCoveragePct: number;
  stripeChargeAmountCents: number;
  stripeFeesCents: number;
  netReceivedCents: number;
  stripeFeeCoveragePct: number;
  netRevenueCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  salesTaxAccrualCents: number;
  affiliateCommissionAccrualCents: number;
  refundedTodayCount: number;
  commissionsCreatedTodayCount: number;
  commissionsCreatedTodayCents: number;
  opex30dTotalCents: number | null;
  opexDailyAvgCents: number | null;
  netIncomeCents: number | null;
}

interface OpExBucket {
  category: string;
  label: string;
  totalCents: number;
  txnCount: number;
}

interface OpExSummary {
  fromIso: string;
  toIso: string;
  totalCents: number;
  txnCount: number;
  byCategory: OpExBucket[];
}

interface StoredSnapshot {
  id: string;
  snapshotDate: string;
  payload: PlSnapshotPayload;
  createdAt: string;
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export default function FinanceDashboardPage(): ReactElement {
  const [snapshots, setSnapshots] = useState<StoredSnapshot[]>([]);
  const [opex, setOpex] = useState<OpExSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [snapRes, opexRes] = await Promise.all([
          fetch('/api/admin/finance/snapshot?limit=30'),
          fetch('/api/admin/finance/opex?days=30'),
        ]);
        const snapBody = (await snapRes.json()) as ApiResponse<StoredSnapshot[]>;
        const opexBody = (await opexRes.json()) as ApiResponse<OpExSummary>;
        if (snapBody.success) setSnapshots(snapBody.data);
        else setError(snapBody.error);
        if (opexBody.success) setOpex(opexBody.data);
        // OpEx failure is non-fatal — show snapshot data even if QB isn't synced
        setError((curr) => (snapBody.success ? null : curr));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load finance data');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const latest = snapshots[0];
  const prior = snapshots[1];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Finance — Internal P&amp;L</h1>
          <p className="text-gray-600 text-sm">
            Phase 1C of the Finance Director. Built from PartyOn data only;
            QuickBooks OpEx joins in Phase 2A.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/finance/plaid"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Plaid reconciliation
          </Link>
          <Link
            href="/admin/finance/journals"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            QB Journals
          </Link>
          <Link
            href="/admin/finance/connect-quickbooks"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            QuickBooks
          </Link>
          <Link
            href="/admin/finance/connect-bank"
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Bank
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm border bg-red-50 border-red-200 text-red-800">
          Error: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-sm">Loading…</p>
      ) : snapshots.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm">
          <p className="text-gray-700 mb-2">
            No finance snapshots yet. The daily cron fires at 07:45 UTC.
          </p>
          <p className="text-gray-500 text-xs">
            To trigger one manually (admin only): hit{' '}
            <code className="bg-gray-100 px-1 rounded">GET /api/cron/finance-snapshot?date=YYYY-MM-DD</code>{' '}
            with the cron bearer token.
          </p>
        </div>
      ) : !latest ? null : (
        <>
          <div className="text-xs text-gray-500 mb-3">
            Latest: <span className="font-medium">{latest.snapshotDate}</span> · captured{' '}
            {new Date(latest.createdAt).toLocaleString()}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi
              label="Gross revenue"
              value={formatCents(latest.payload.grossRevenueCents)}
              delta={
                prior
                  ? deltaCents(latest.payload.grossRevenueCents, prior.payload.grossRevenueCents)
                  : null
              }
              sub={`${latest.payload.paidOrderCount} orders`}
            />
            <Kpi
              label="Net revenue"
              value={formatCents(latest.payload.netRevenueCents)}
              sub={`after refunds + Stripe fees (${pct(latest.payload.stripeFeeCoveragePct)} coverage)`}
            />
            <Kpi
              label="Gross profit"
              value={formatCents(latest.payload.grossProfitCents)}
              sub={`${pct(latest.payload.grossMarginPct)} margin · cost coverage ${pct(latest.payload.marginCoveragePct)}`}
            />
            <Kpi
              label="Net income (est.)"
              value={
                latest.payload.netIncomeCents !== null
                  ? formatCents(latest.payload.netIncomeCents)
                  : 'QB not synced'
              }
              sub={
                latest.payload.opexDailyAvgCents !== null
                  ? `daily OpEx avg ${formatCents(latest.payload.opexDailyAvgCents)} (30d)`
                  : 'connect QB to compute net income'
              }
              alert={
                latest.payload.netIncomeCents !== null &&
                latest.payload.netIncomeCents < 0
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Card title="Revenue breakdown (window)">
              <Row label="Subtotal" value={formatCents(latest.payload.subtotalCents)} />
              <Row
                label="Discounts"
                value={`-${formatCents(latest.payload.discountAmountCents)}`}
              />
              <Row label="Delivery fees" value={formatCents(latest.payload.deliveryFeesCents)} />
              <Row label="Tips" value={formatCents(latest.payload.tipsCents)} />
              <Row label="Tax collected" value={formatCents(latest.payload.taxCollectedCents)} />
              <Divider />
              <Row
                label="Gross revenue"
                value={formatCents(latest.payload.grossRevenueCents)}
                bold
              />
            </Card>

            <Card title="Stripe (net)">
              <Row
                label="Charge amount"
                value={formatCents(latest.payload.stripeChargeAmountCents)}
              />
              <Row label="Stripe fees" value={`-${formatCents(latest.payload.stripeFeesCents)}`} />
              <Row label="Net received" value={formatCents(latest.payload.netReceivedCents)} />
              <Divider />
              <Row
                label="Fee coverage"
                value={pct(latest.payload.stripeFeeCoveragePct)}
                sub={
                  latest.payload.stripeFeeCoveragePct < 100
                    ? 'Run backfill-stripe-history to fill the gap'
                    : null
                }
              />
            </Card>

            <Card title="OpEx by category (trailing 30d)">
              {!opex || opex.byCategory.length === 0 ? (
                <p className="text-gray-500 text-xs">
                  No QuickBooks expense data yet. Connect QB at{' '}
                  <Link className="text-blue-600 hover:underline" href="/admin/finance/connect-quickbooks">
                    /admin/finance/connect-quickbooks
                  </Link>{' '}
                  and wait for the weekly cron (Monday 07:50 UTC), or trigger
                  it manually with the bearer token.
                </p>
              ) : (
                <>
                  {opex.byCategory.slice(0, 8).map((b) => {
                    const sharePct = opex.totalCents > 0 ? (b.totalCents / opex.totalCents) * 100 : 0;
                    return (
                      <div key={b.category}>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-700 text-sm">{b.label}</span>
                          <span className="tabular-nums text-sm">{formatCents(b.totalCents)}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded mt-0.5">
                          <div
                            className="h-1 bg-blue-500 rounded"
                            style={{ width: `${Math.min(100, sharePct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Divider />
                  <Row
                    label="Total OpEx"
                    value={formatCents(opex.totalCents)}
                    sub={`${opex.txnCount} transactions`}
                    bold
                  />
                </>
              )}
            </Card>

            <Card title="Accruals (cumulative)">
              <Row
                label="Sales tax accrual"
                value={formatCents(latest.payload.salesTaxAccrualCents)}
                sub="Phase 4 will track remittance against this"
              />
              <Row
                label="Affiliate commissions held"
                value={formatCents(latest.payload.affiliateCommissionAccrualCents)}
                sub={`HELD + APPROVED commissions outstanding`}
              />
              <Divider />
              <Row
                label="Today's new commissions"
                value={formatCents(latest.payload.commissionsCreatedTodayCents)}
                sub={`${latest.payload.commissionsCreatedTodayCount} created`}
              />
            </Card>
          </div>

          {snapshots.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Orders</th>
                    <th className="text-right p-3">Gross</th>
                    <th className="text-right p-3">Refunds</th>
                    <th className="text-right p-3">Stripe fees</th>
                    <th className="text-right p-3">Net</th>
                    <th className="text-right p-3">Gross profit</th>
                    <th className="text-right p-3">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="p-3 text-gray-800">{s.snapshotDate}</td>
                      <td className="p-3 text-right tabular-nums">{s.payload.paidOrderCount}</td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCents(s.payload.grossRevenueCents)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-red-700">
                        {s.payload.refundedAmountCents > 0
                          ? `-${formatCents(s.payload.refundedAmountCents)}`
                          : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums text-gray-600">
                        {formatCents(s.payload.stripeFeesCents)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCents(s.payload.netRevenueCents)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCents(s.payload.grossProfitCents)}
                      </td>
                      <td className="p-3 text-right tabular-nums">{pct(s.payload.grossMarginPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function deltaCents(now: number, prior: number): { dirCents: number; pct: number } | null {
  if (prior === 0) return null;
  const diff = now - prior;
  return { dirCents: diff, pct: (diff / prior) * 100 };
}

function Kpi({
  label,
  value,
  sub,
  delta,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { dirCents: number; pct: number } | null;
  alert?: boolean;
}): ReactElement {
  return (
    <div
      className={`p-4 rounded-lg border ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
    >
      <div className="text-gray-600 text-xs">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {delta && (
        <div
          className={`text-xs mt-0.5 ${
            delta.dirCents >= 0 ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {delta.dirCents >= 0 ? '+' : ''}
          {delta.pct.toFixed(1)}% vs prior day
        </div>
      )}
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">{title}</h3>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  bold,
}: {
  label: string;
  value: string;
  sub?: string | null;
  bold?: boolean;
}): ReactElement {
  return (
    <div>
      <div className={`flex justify-between items-baseline ${bold ? 'font-semibold' : ''}`}>
        <span className="text-gray-700">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function Divider(): ReactElement {
  return <div className="border-t border-gray-100 my-2" />;
}
