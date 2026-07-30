'use client';

import { ReactElement, useCallback, useEffect, useState } from 'react';
import SlideToConfirm from './detail/SlideToConfirm';

/** One payer as returned by the bulk-cancel preview. */
interface PreviewRow {
  orderId: string;
  orderNumber: number;
  customerName: string;
  total: number;
  refundable: number;
  alreadyTerminal: boolean;
  hasPayment: boolean;
  refundableError?: string;
}

/** One payer's outcome after the run. */
interface ResultRow {
  orderId: string;
  orderNumber: number | null;
  customerName: string | null;
  ok: boolean;
  refundedAmount?: number;
  error?: string;
}

interface RunSummary {
  cancelledCount: number;
  failedCount: number;
  refundedTotal: number;
  results: ResultRow[];
}

const money = (n: number): string => `$${n.toFixed(2)}`;

/**
 * Whole-cooler cancel. The cooler card groups many separate payments into one
 * delivery, so cancelling it means cancelling every sub-order — this confirms
 * the exact list and the real Stripe-refundable total before any money moves,
 * then reports what happened per payer.
 *
 * Money-out is gated by slide-to-confirm, matching the per-order refund zone:
 * a stray tap must never issue seven refunds.
 */
export default function BulkCancelModal({
  orders,
  contextLabel,
  onClose,
  onDone,
}: {
  orders: Array<{ id: string; orderNumber: number; customerName: string; total: number }>;
  /** e.g. "Jarred Zelenski · Fri 7/31" — what the operator thinks they're cancelling. */
  contextLabel?: string;
  onClose: () => void;
  onDone: () => void;
}): ReactElement {
  const [issueRefund, setIssueRefund] = useState(true);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const orderIds = orders.map((o) => o.id);
  const orderIdsKey = orderIds.join(',');

  // Pull the true refundable amount per payer from Stripe before showing a
  // number the operator will act on — Order.total is rewritten by amendments.
  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    fetch('/api/v1/admin/orders/bulk-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: orderIdsKey.split(','), preview: true }),
    })
      .then(async (res) => ({ status: res.status, body: await res.json() }))
      .then(({ status, body }) => {
        if (cancelled) return;
        if (body.success) {
          setPreview(body.data.orders as PreviewRow[]);
        } else if (status === 401 || status === 403) {
          setPreviewError(
            body.error || 'You do not have permission to cancel orders in bulk.',
          );
        } else {
          setPreviewError(body.error || 'Could not load the cancellation preview');
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewError('Could not load the cancellation preview');
      });
    return () => {
      cancelled = true;
    };
  }, [orderIdsKey]);

  const cancellable = preview?.filter((p) => !p.alreadyTerminal) ?? [];
  const skipped = preview?.filter((p) => p.alreadyTerminal) ?? [];
  const refundTotal = cancellable.reduce((sum, p) => sum + p.refundable, 0);
  const noPaymentCount = cancellable.filter((p) => !p.hasPayment).length;
  const lookupFailures = cancellable.filter((p) => p.refundableError).length;

  const handleConfirm = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/v1/admin/orders/bulk-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: orderIdsKey.split(','),
          issueRefund,
          customNote: note || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.data as RunSummary);
      } else {
        alert(data.error || 'Failed to cancel orders');
      }
    } catch (error) {
      console.error('Bulk cancel failed:', error);
      alert('Failed to cancel orders');
    } finally {
      setProcessing(false);
    }
  }, [issueRefund, note, orderIdsKey, processing]);

  // --- Results view ---
  if (summary) {
    return (
      <Shell
        title={summary.failedCount === 0 ? 'Cancelled' : 'Finished with errors'}
        subtitle={`${summary.cancelledCount} of ${summary.results.length} order${
          summary.results.length === 1 ? '' : 's'
        } cancelled${summary.refundedTotal > 0 ? ` · ${money(summary.refundedTotal)} refunded` : ''}`}
        onClose={onDone}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-1.5">
          {summary.results.map((r) => (
            <div
              key={r.orderId}
              className={`flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                r.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'
              }`}
            >
              <span className="min-w-0">
                <span className="font-semibold">
                  {r.customerName || 'Unknown'}
                  {r.orderNumber !== null && (
                    <span className="font-mono font-normal text-gray-500"> #{r.orderNumber}</span>
                  )}
                </span>
                {!r.ok && r.error && <span className="block">{r.error}</span>}
              </span>
              <span className="flex-shrink-0 font-semibold tabular-nums">
                {r.ok
                  ? r.refundedAmount
                    ? `Refunded ${money(r.refundedAmount)}`
                    : 'Cancelled'
                  : 'Failed'}
              </span>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="min-h-[44px] px-6 bg-brand-blue text-white font-semibold tracking-[0.08em] rounded-lg hover:bg-brand-blue/90"
          >
            Done
          </button>
        </div>
      </Shell>
    );
  }

  // --- Confirm view ---
  return (
    <Shell
      title={`Cancel ${orders.length} order${orders.length === 1 ? '' : 's'}`}
      subtitle={contextLabel}
      onClose={processing ? undefined : onClose}
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-semibold text-red-900">
            This cancels every order listed below and cannot be undone.
          </p>
          <p className="text-sm text-red-800 mt-0.5">
            Each payer is emailed a cancellation notice
            {issueRefund ? ', plus a refund confirmation' : ''}.
          </p>
        </div>

        {/* No preview means no verified amounts, and the slide below stays
            disabled — never let a cancel run on numbers we couldn't confirm. */}
        {previewError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {previewError} Cancelling is blocked until the amounts can be verified — the
            figures below are each order&apos;s recorded total, not confirmed refunds.
          </div>
        )}

        {!preview && !previewError && (
          <p className="text-sm text-gray-500">Reading refundable amounts from Stripe…</p>
        )}

        <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={issueRefund}
            onChange={(e) => setIssueRefund(e.target.checked)}
            className="mt-0.5 w-5 h-5 flex-shrink-0 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <span className="text-sm text-gray-900">
            Refund every payer in full —{' '}
            <strong className="tabular-nums">{money(refundTotal)}</strong> across{' '}
            {cancellable.length} order{cancellable.length === 1 ? '' : 's'}
            {noPaymentCount > 0 && (
              <span className="block text-red-700">
                {noPaymentCount} order{noPaymentCount === 1 ? ' has' : 's have'} no Stripe payment
                and will be skipped rather than cancelled while this is on.
              </span>
            )}
            {lookupFailures > 0 && (
              <span className="block text-amber-800">
                {lookupFailures} refundable amount{lookupFailures === 1 ? '' : 's'} could not be read
                from Stripe — the total above is understated.
              </span>
            )}
          </span>
        </label>

        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
          {(preview ?? orders.map(toFallbackRow)).map((p) => (
            <div key={p.orderId} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="min-w-0 text-sm text-gray-900">
                <span className="font-semibold">{p.customerName}</span>
                <span className="font-mono text-gray-500"> #{p.orderNumber}</span>
              </span>
              <span className="flex-shrink-0 text-sm tabular-nums">
                {p.alreadyTerminal ? (
                  <span className="text-gray-500">already cancelled — skipped</span>
                ) : !p.hasPayment ? (
                  <span className="text-gray-600">no payment on file</span>
                ) : (
                  <span className="font-semibold text-gray-900">{money(p.refundable)}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {skipped.length > 0 && (
          <p className="text-sm text-gray-500">
            {skipped.length} order{skipped.length === 1 ? '' : 's'} already cancelled or refunded —
            left untouched.
          </p>
        )}

        <label className="block">
          <span className="block text-base font-medium text-gray-700 mb-1">Note to customers (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Why the delivery was cancelled…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 space-y-3">
        <SlideToConfirm
          label={
            processing
              ? 'Cancelling…'
              : issueRefund
                ? `Slide to cancel ${cancellable.length} & refund ${money(refundTotal)}`
                : `Slide to cancel ${cancellable.length} order${cancellable.length === 1 ? '' : 's'}`
          }
          disabled={processing || !preview || cancellable.length === 0}
          onConfirm={() => void handleConfirm()}
        />
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="w-full min-h-[44px] text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Go back
        </button>
      </div>
    </Shell>
  );
}

/** Pre-preview placeholder so the payer list renders instantly on open. */
function toFallbackRow(o: {
  id: string;
  orderNumber: number;
  customerName: string;
  total: number;
}): PreviewRow {
  return {
    orderId: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    total: o.total,
    refundable: o.total,
    alreadyTerminal: false,
    hasPayment: true,
  };
}

function Shell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
}): ReactElement {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[88vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-heading text-xl font-bold tracking-[0.08em] uppercase text-gray-900">
              {title}
            </h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
