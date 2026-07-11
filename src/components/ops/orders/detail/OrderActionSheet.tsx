'use client';

import { ReactElement, ReactNode } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import SlideToConfirm from './SlideToConfirm';
import { computeAmendmentRefundPrefill, claimedRefundIds } from './refund-prefill';
import type { OrderDetail } from './types';

function ActionRow({
  icon,
  label,
  hint,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-[52px] flex items-center gap-3 px-1 py-2 text-left border-b border-gray-100 last:border-b-0 disabled:opacity-40 hover:bg-gray-50 transition-colors touch-manipulation"
    >
      <span className="text-gray-500 flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{label}</span>
        {hint && <span className="block text-sm text-gray-500">{hint}</span>}
      </span>
    </button>
  );
}

/**
 * Order overflow action sheet: the everyday actions plus an isolated red
 * refund zone. Refunds are exact-amount, preset-chipped, and confirmed by a
 * slide gesture — never a bare tap. All money state and the processRefund
 * call live in the page; the server enforces the Stripe-authoritative cap.
 * When the refund is attached to a PENDING amendment, a callout nets the
 * amendment's amount against refunds recorded since it was created, so a
 * retry never silently re-offers money that already went back.
 */
export default function OrderActionSheet({
  open,
  onClose,
  order,
  canAmend,
  saving,
  sendingReceipt,
  sendingReview,
  refundAmount,
  refundReason,
  refundType,
  refundProcessing,
  pendingAmendmentId,
  onRefundAmount,
  onRefundReason,
  onRefundType,
  onMarkDelivered,
  onPrint,
  onSendReceipt,
  onAmend,
  onRequestReview,
  onProcessRefund,
}: {
  open: boolean;
  onClose: () => void;
  order: OrderDetail;
  canAmend: boolean;
  saving: boolean;
  sendingReceipt: boolean;
  sendingReview: boolean;
  refundAmount: number;
  refundReason: string;
  refundType: string;
  refundProcessing: boolean;
  pendingAmendmentId: string | null;
  onRefundAmount: (amount: number) => void;
  onRefundReason: (reason: string) => void;
  onRefundType: (type: string) => void;
  onMarkDelivered: () => void;
  onPrint: () => void;
  onSendReceipt: () => void;
  onAmend: () => void;
  onRequestReview: () => void;
  onProcessRefund: () => void;
}): ReactElement | null {
  const delivered = order.fulfillmentStatus === 'DELIVERED';
  const cancelled = order.status === 'CANCELLED';
  const maxRefundable = Math.max(
    0,
    (order.refunds?.stripeCapturedAmount ?? order.pricing.total) - (order.refunds?.totalRefunded || 0),
  );

  // While the refund is attached to a PENDING refund-direction amendment,
  // net its amount against refunds recorded since the amendment was created.
  // Lifecycle rides on pendingAmendmentId: the page clears it when the
  // operator edits the amount, on a fresh sheet open, and after a refund.
  const pendingAmendment = pendingAmendmentId
    ? order.amendments?.find(
        (a) => a.id === pendingAmendmentId && a.amountDelta < 0 && a.resolution === 'PENDING',
      )
    : undefined;
  const amendmentPrefill = pendingAmendment
    ? computeAmendmentRefundPrefill(pendingAmendment, order.refunds?.items ?? [], {
        excludeRefundIds: claimedRefundIds(order.amendments ?? []),
      })
    : null;

  const chip = (active: boolean): string =>
    `min-h-[44px] px-3 text-sm font-semibold rounded-lg border transition-colors touch-manipulation ${
      active
        ? 'bg-white border-red-400 text-red-800 shadow-sm'
        : 'bg-red-100/60 border-red-200 text-red-700 hover:bg-white'
    }`;

  return (
    <BottomSheet open={open} onClose={onClose} title="Order actions">
      <div className="pb-2">
        {!delivered && !cancelled && (
          <ActionRow
            icon={
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Mark delivered"
            hint="Completes fulfillment and releases inventory"
            disabled={saving}
            onClick={onMarkDelivered}
          />
        )}
        <ActionRow
          icon={
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
            </svg>
          }
          label="Print pick sheet"
          hint="The paper order sheet with pick checkboxes"
          onClick={() => {
            onClose();
            onPrint();
          }}
        />
        {order.financialStatus === 'PAID' && (
          <ActionRow
            icon={
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            }
            label="Send invoice copy"
            hint={`Emails the receipt to ${order.customerSnapshot.email || order.customer.email}`}
            disabled={sendingReceipt}
            onClick={onSendReceipt}
          />
        )}
        {canAmend && (
          <ActionRow
            icon={
              <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            }
            label="Amend order"
            hint="Edit items, fees, and delivery details"
            onClick={() => {
              onClose();
              onAmend();
            }}
          />
        )}
        <ActionRow
          icon={
            <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
          label="Request review"
          hint={
            order.reviewRequestSentAt
              ? `Already sent ${new Date(order.reviewRequestSentAt).toLocaleDateString()}`
              : 'Texts the customer a review link'
          }
          disabled={sendingReview || !!order.reviewRequestSentAt}
          onClick={onRequestReview}
        />

        {/* Refund zone — isolated, red, slide-to-confirm */}
        {order.payment.stripePaymentIntentId && (
          <div className="mt-4 mb-2 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h3 className="font-heading font-bold text-base tracking-[0.08em] uppercase text-red-900">
                Refund
              </h3>
              <span className="text-sm font-semibold text-red-800 tabular-nums">
                Max ${maxRefundable.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {order.pricing.deliveryFee > 0 && (
                <button
                  type="button"
                  className={chip(refundType === 'delivery')}
                  onClick={() => {
                    onRefundType('delivery');
                    onRefundAmount(order.pricing.deliveryFee);
                    onRefundReason('Delivery fee refund');
                  }}
                >
                  Delivery ${order.pricing.deliveryFee.toFixed(2)}
                </button>
              )}
              {order.pricing.tipAmount > 0 && (
                <button
                  type="button"
                  className={chip(refundType === 'tip')}
                  onClick={() => {
                    onRefundType('tip');
                    onRefundAmount(order.pricing.tipAmount);
                    onRefundReason('Tip refund');
                  }}
                >
                  Tip ${order.pricing.tipAmount.toFixed(2)}
                </button>
              )}
              {order.pricing.deliveryFee > 0 && order.pricing.tipAmount > 0 && (
                <button
                  type="button"
                  className={chip(refundType === 'delivery_tip')}
                  onClick={() => {
                    onRefundType('delivery_tip');
                    onRefundAmount(order.pricing.deliveryFee + order.pricing.tipAmount);
                    onRefundReason('Delivery fee + tip refund');
                  }}
                >
                  Delivery + Tip
                </button>
              )}
              <button
                type="button"
                className={chip(refundType === 'full')}
                onClick={() => {
                  onRefundType('full');
                  onRefundAmount(maxRefundable);
                  onRefundReason('Full refund');
                }}
              >
                Full ${maxRefundable.toFixed(2)}
              </button>
              <button
                type="button"
                className={chip(refundType === 'custom')}
                onClick={() => {
                  onRefundType('custom');
                  onRefundAmount(0);
                  onRefundReason('');
                }}
              >
                Custom
              </button>
            </div>

            <div className="grid grid-cols-[110px_1fr] gap-2 mb-3">
              <label className="block">
                <span className="block text-xs font-semibold text-red-900/70 uppercase tracking-wider mb-1">Amount</span>
                <div className="flex items-center gap-1 bg-white border border-red-200 rounded-lg px-2">
                  <span className="text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={refundAmount}
                    onChange={(e) => {
                      onRefundAmount(parseFloat(e.target.value) || 0);
                      onRefundType('custom');
                    }}
                    step="0.01"
                    min="0"
                    className="w-full min-h-[44px] text-base font-semibold text-gray-900 focus:outline-none tabular-nums"
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-red-900/70 uppercase tracking-wider mb-1">Reason</span>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => onRefundReason(e.target.value)}
                  placeholder="Reason for refund"
                  className="w-full min-h-[44px] px-3 bg-white border border-red-200 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </label>
            </div>

            {order.refunds && order.refunds.totalRefunded > 0 && (
              <p className="text-sm text-red-800 mb-3">
                Previously refunded ${order.refunds.totalRefunded.toFixed(2)} across {order.refunds.count} refund{order.refunds.count === 1 ? '' : 's'}.
              </p>
            )}

            {amendmentPrefill && amendmentPrefill.refundedSinceAmendment > 0 && (
              <div className="mb-3 flex gap-2 rounded-lg border border-red-300 bg-white p-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-900">
                  {amendmentPrefill.fullyCovered ? (
                    <>
                      This amendment&apos;s <strong>${amendmentPrefill.amendmentAmount.toFixed(2)}</strong> looks
                      fully covered — ${amendmentPrefill.refundedSinceAmendment.toFixed(2)} was refunded after it
                      was created, leaving nothing to refund. Entering an amount processes a manual refund and
                      the amendment stays pending.
                    </>
                  ) : (
                    <>
                      ${amendmentPrefill.refundedSinceAmendment.toFixed(2)} of this amendment&apos;s{' '}
                      <strong>${amendmentPrefill.amendmentAmount.toFixed(2)}</strong> was already refunded after it
                      was created, leaving <strong>${amendmentPrefill.suggestedAmount.toFixed(2)}</strong> to
                      refund. The amendment will stay pending (only an exact full-amount refund marks it
                      refunded).
                    </>
                  )}
                </p>
              </div>
            )}

            <SlideToConfirm
              label={
                refundProcessing
                  ? 'Processing…'
                  : `Slide to refund $${refundAmount.toFixed(2)}`
              }
              disabled={refundProcessing || refundAmount <= 0 || refundAmount > maxRefundable}
              onConfirm={onProcessRefund}
            />
            <p className="mt-2 text-sm text-red-900/70">
              Refunds are exact-amount, two-step, and logged. The customer is emailed.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
