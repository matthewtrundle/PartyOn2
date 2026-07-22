import { ReactElement } from 'react';
import type { ListResult } from '@/lib/premiere-credits/admin';

const money = (n: number): string => `$${n.toFixed(2)}`;

/**
 * Invoice roll-up for a date range: what Premiere gets billed. Shows BOTH
 * billing bases — the granted amount and the amount actually redeemed
 * (DiscountUsage.amountSaved) — so the operator can pick the basis.
 */
export default function InvoiceSummary({ summary }: { summary: ListResult['summary'] }): ReactElement {
  return (
    <div className="card mb-6">
      <h3 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-4">Invoice summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Grants shown" value={String(summary.count)} />
        <Stat label="Redeemed" value={String(summary.redeemedCount)} />
        <Stat label="Redeemed — granted total" value={money(summary.totalRedeemedGranted)} highlight />
        <Stat label="Redeemed — actual applied" value={money(summary.totalRedeemedSaved)} />
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Bill Premiere only for redeemed codes. &ldquo;Granted total&rdquo; is the face value of
        redeemed credits; &ldquo;actual applied&rdquo; is the dollars actually taken off orders
        (lower when a credit exceeded the order). Pick the basis you invoice on.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }): ReactElement {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
