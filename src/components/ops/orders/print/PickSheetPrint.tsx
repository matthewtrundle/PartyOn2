'use client';

import React, { ReactElement } from 'react';
import { formatAddress, formatCurrency, cruiseLabelForCard } from '../format';
import { loadCachedChecks } from '../usePickChecks';
import type { OrderCardData, OrdersViewOrder } from '@/lib/ops/orders-view-data';

/**
 * Print-only pick sheets: one sheet (page) per cooler card.
 *
 * - Solo orders print the classic single-order sheet.
 * - Group dashboards (a shareCode shared across several payers) print ONE
 *   combined sheet: a shared banner + delivery/partner block, then a per-guest
 *   item checklist for each order, and combined money totals. The sheet flows
 *   to fill the page — guest blocks are NOT kept whole (that wasted up to half
 *   a page), so a long group can split a guest across pages, but individual
 *   rows stay intact and the column header repeats on the overflow page.
 *
 * The banner leads with the order number + full customer name on one line and
 * the day/date/time on the next, so long times no longer crop.
 *
 * Render inside a `hidden print:block` container; callers must prefetch pick
 * state (fetchChecks → cacheChecks) for every order before mounting so the
 * sheet reflects cross-device updates.
 */
export default function PickSheetPrint({ cards }: { cards: OrderCardData[] }): ReactElement {
  return (
    <>
      {cards.map((card, idx) => {
        const cruiseLabel = cruiseLabelForCard(card);
        const zoom = fitZoom(card);
        // Page break before every sheet but the first; `zoom` shrinks the
        // whole sheet just enough to stay on one page (only when it would
        // otherwise overflow — see fitZoom).
        const style = {
          ...(idx > 0 ? { pageBreakBefore: 'always' } : {}),
          ...(zoom < 1 ? { zoom } : {}),
        } as React.CSSProperties;
        return (
          <div
            key={card.key}
            className={`order-sheet ${idx > 0 ? 'break-before-page' : ''}`}
            style={style}
          >
            {card.orders.length > 1 ? (
              <GroupSheet card={card} cruiseLabel={cruiseLabel} />
            ) : (
              <SoloSheet order={card.orders[0]} displayName={card.displayName} cruiseLabel={cruiseLabel} />
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Sheets ---------------------------------------------------------------

/** One payer / direct order — the familiar single-order pick sheet. */
function SoloSheet({
  order,
  displayName,
  cruiseLabel,
}: {
  order: OrdersViewOrder;
  /** Card's resolved name (boat-manifest full name when available) — beats the
   *  raw customerName, which is often just a first name ("Mary"). */
  displayName: string;
  cruiseLabel: string | null;
}): ReactElement {
  const addrStr = order.deliveryAddress ? formatAddress(order.deliveryAddress) : '';
  return (
    <>
      <SheetBanner
        orderNumber={`#${order.orderNumber}`}
        name={displayName?.trim() || fullName(order)}
        dateLine={bannerDateLine(order)}
        affiliate={order.affiliate?.businessName}
        marina={addrMarina(addrStr)}
        cruiseLabel={cruiseLabel}
      />

      {order.groupOrder && (
        <div className="mb-2 px-2 py-1 border-2 border-blue-500 bg-blue-50 rounded text-sm font-bold">
          Group Order: {order.groupOrder.name || order.groupOrder.shareCode}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <CustomerBox order={order} />
        <DeliveryBox order={order} addrStr={addrStr} />
        {order.affiliate && <PartnerBox affiliate={order.affiliate} />}
      </div>

      {order.deliveryInstructions && <InstructionsBox text={order.deliveryInstructions} />}

      {(order.customerNote || order.internalNote) && (
        <div className="mb-3 space-y-1">
          {order.customerNote && <NoteLine label="Customer" text={order.customerNote} />}
          {order.internalNote && <NoteLine label="Internal" text={order.internalNote} />}
        </div>
      )}

      <ItemChecklistTable order={order} />

      <TotalsBox
        subtotal={order.subtotal}
        discount={order.discountAmount}
        delivery={order.deliveryFee}
        tax={order.taxAmount}
        total={order.total}
      />
    </>
  );
}

/** A group dashboard's orders pooled onto one sheet, one checklist per guest. */
function GroupSheet({
  card,
  cruiseLabel,
}: {
  card: OrderCardData;
  cruiseLabel: string | null;
}): ReactElement {
  const orders = card.orders;
  const first = orders[0];
  const addrStr = first.deliveryAddress ? formatAddress(first.deliveryAddress) : '';
  const affiliate = orders.find((o) => o.affiliate)?.affiliate ?? null;
  const totals = orders.reduce(
    (acc, o) => ({
      subtotal: acc.subtotal + o.subtotal,
      discount: acc.discount + o.discountAmount,
      delivery: acc.delivery + o.deliveryFee,
      tax: acc.tax + o.taxAmount,
      total: acc.total + o.total,
    }),
    { subtotal: 0, discount: 0, delivery: 0, tax: 0, total: 0 },
  );

  return (
    <>
      <SheetBanner
        name={card.displayName}
        dateLine={bannerDateLine(first)}
        affiliate={affiliate?.businessName}
        marina={addrMarina(addrStr)}
        cruiseLabel={cruiseLabel}
      />

      <div className="mb-2 px-2 py-1 border-2 border-blue-500 bg-blue-50 rounded text-sm font-bold flex flex-wrap justify-between gap-x-4">
        <span>
          Group: {card.dashboard?.name || card.displayName}
          {card.shareCode ? ` · ${card.shareCode}` : ''}
        </span>
        <span className="text-blue-700">
          {orders.length} orders · {orders.map((o) => `#${o.orderNumber}`).join('  ')}
        </span>
      </div>

      <div className="flex gap-2 mb-2">
        <DeliveryBox order={first} addrStr={addrStr} />
        {affiliate && <PartnerBox affiliate={affiliate} />}
      </div>

      {first.deliveryInstructions && <InstructionsBox text={first.deliveryInstructions} />}

      {orders.map((o) => (
        <GuestBlock key={o.id} order={o} />
      ))}

      <TotalsBox
        subtotal={totals.subtotal}
        discount={totals.discount}
        delivery={totals.delivery}
        tax={totals.tax}
        total={totals.total}
      />
    </>
  );
}

/** One guest's section inside a group sheet: name header + their checklist. */
function GuestBlock({ order }: { order: OrdersViewOrder }): ReactElement {
  const contact = [order.customerPhone || order.deliveryPhone, order.customerEmail]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between border-b-2 border-gray-800 pb-0.5 mb-1 break-after-avoid">
        <div className="text-lg font-black tracking-tight">
          #{order.orderNumber} &middot; {fullName(order)}
        </div>
        {contact && <div className="text-sm text-gray-600">{contact}</div>}
      </div>

      {(order.customerNote || order.internalNote) && (
        <div className="mb-1.5 space-y-1">
          {order.customerNote && <NoteLine label="Customer" text={order.customerNote} />}
          {order.internalNote && <NoteLine label="Internal" text={order.internalNote} />}
        </div>
      )}

      <ItemChecklistTable order={order} />
    </div>
  );
}

// --- Banner & info boxes --------------------------------------------------

/**
 * Color-coded sheet banner. Line 1 = order number (when solo) + full name;
 * line 2 = day, date, and time — on its own line so the time never crops.
 */
function SheetBanner({
  orderNumber,
  name,
  dateLine,
  affiliate,
  marina,
  cruiseLabel,
}: {
  orderNumber?: string;
  name: string;
  dateLine: string;
  affiliate?: string;
  marina: boolean;
  cruiseLabel?: string | null;
}): ReactElement {
  return (
    <div
      className={`rounded-lg px-3 py-1.5 mb-2 ${marina ? 'bg-blue-600 text-white' : 'bg-yellow-400 text-black'}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 flex-wrap leading-none">
          {orderNumber && (
            <span className="text-[32px] font-black tracking-tight whitespace-nowrap">{orderNumber}</span>
          )}
          <span className="text-[28px] font-black tracking-tight break-words">{name}</span>
        </div>
        {cruiseLabel && (
          <span className="shrink-0 self-center rounded-md bg-gray-900 text-white text-2xl font-black tracking-[0.15em] px-3 py-1">
            {cruiseLabel}
          </span>
        )}
      </div>
      <div className="text-lg font-bold leading-none mt-0.5">{dateLine}</div>
      {affiliate && (
        <div className="flex justify-end mt-0.5">
          <span className="text-base font-semibold opacity-85">{affiliate}</span>
        </div>
      )}
    </div>
  );
}

function CustomerBox({ order }: { order: OrdersViewOrder }): ReactElement {
  return (
    <div className="flex-1 border border-gray-400 rounded p-1.5">
      <BoxHeading>Customer</BoxHeading>
      <div className="font-bold text-sm">{order.customerName}</div>
      <div className="text-sm">{order.customerEmail}</div>
      {order.customerPhone && <div className="text-sm">Tel: {order.customerPhone}</div>}
    </div>
  );
}

function DeliveryBox({ order, addrStr }: { order: OrdersViewOrder; addrStr: string }): ReactElement {
  return (
    <div className="flex-1 border border-gray-400 rounded p-1.5">
      <BoxHeading>Delivery</BoxHeading>
      <div className="font-bold text-sm">
        {new Date(order.deliveryDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })}{' '}
        &middot; {order.deliveryTime}
      </div>
      {addrStr && <div className="text-sm mt-1">{addrStr}</div>}
      {order.deliveryPhone && <div className="text-sm mt-1">Tel: {order.deliveryPhone}</div>}
    </div>
  );
}

function PartnerBox({
  affiliate,
}: {
  affiliate: NonNullable<OrdersViewOrder['affiliate']>;
}): ReactElement {
  return (
    <div className="flex-1 border border-gray-400 rounded p-1.5">
      <BoxHeading>Partner</BoxHeading>
      <div className="font-bold text-sm">{affiliate.businessName}</div>
      <div className="text-sm">{affiliate.contactName}</div>
      {affiliate.phone && <div className="text-sm">Tel: {affiliate.phone}</div>}
    </div>
  );
}

function BoxHeading({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-0.5 mb-0.5">
      {children}
    </div>
  );
}

function InstructionsBox({ text }: { text: string }): ReactElement {
  return (
    <div className="mb-2 px-2 py-1 border-2 border-yellow-500 bg-yellow-50 rounded text-sm">
      <span className="font-bold">Instructions: </span>
      {text}
    </div>
  );
}

function NoteLine({ label, text }: { label: string; text: string }): ReactElement {
  return (
    <div className="px-2 py-1 border border-gray-400 rounded text-sm">
      <span className="font-bold">{label} Note: </span>
      {text}
    </div>
  );
}

// --- Item checklist -------------------------------------------------------

/** The per-order pick/pack checklist, pre-filled from cached pick state. */
function ItemChecklistTable({ order }: { order: OrdersViewOrder }): ReactElement {
  const checks = loadCachedChecks(order.id);
  return (
    <table className="w-full mb-2 border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-black">
          <th className="text-left py-0.5 px-2 font-bold">Item</th>
          <th className="text-center py-0.5 px-2 w-12 font-bold">Qty</th>
          <th className="text-center py-0.5 w-16 font-bold">In Stock?</th>
          <th className="text-center py-0.5 w-16 font-bold">Packed?</th>
          <th className="text-center py-0.5 w-16 font-bold">Short By</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item, idx) => (
          <React.Fragment key={idx}>
            <tr className="border-b border-gray-300">
              <td className="py-0.5 px-2">
                <span className="font-medium">{item.title}</span>
              </td>
              <td className="text-center py-0.5 px-2 font-bold text-base">{item.quantity}</td>
              <td className="text-center py-0.5">
                <PickBox on={!!checks[item.title]?.inStock} />
              </td>
              <td className="text-center py-0.5">
                <PickBox on={!!checks[item.title]?.packed} />
              </td>
              <td className="text-center py-0.5 font-bold text-base">
                {checks[item.title]?.shortBy || ''}
              </td>
            </tr>
            {item.bundleComponents?.map((bc, bcIdx) => {
              const bcKey = `${item.title}::${bc.title}`;
              return (
                <tr key={`${idx}-bc-${bcIdx}`} className="border-b border-gray-200">
                  <td className="py-0.5 pl-6 pr-2 text-gray-500 text-[13px]">
                    |- {bc.title}
                    {bc.variantTitle && bc.variantTitle !== 'Default Title' && ` (${bc.variantTitle})`}
                  </td>
                  <td className="text-center py-0.5 text-[13px] font-semibold text-gray-500">
                    {item.quantity * bc.quantity}
                  </td>
                  <td className="text-center py-0.5">
                    <PickBox on={!!checks[bcKey]?.inStock} small />
                  </td>
                  <td className="text-center py-0.5">
                    <PickBox on={!!checks[bcKey]?.packed} small />
                  </td>
                  <td className="text-center py-0.5 text-[13px] font-semibold text-gray-500">
                    {checks[bcKey]?.shortBy || ''}
                  </td>
                </tr>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-black">
          <td className="py-1 px-2 font-bold">
            Total Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
          </td>
          <td></td>
          <td colSpan={3} className="text-center py-1">
            <span className="font-bold text-sm mr-1">Order Complete?</span>
            <span className="inline-block w-5 h-5 border-2 border-black rounded-sm align-middle"></span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** A printed checkbox, filled black with a white tick when `on`. */
function PickBox({ on, small }: { on: boolean; small?: boolean }): ReactElement {
  const size = small ? 'w-3.5 h-3.5 border-[1.5px]' : 'w-[18px] h-[18px] border-2';
  return (
    <span className={`inline-block ${size} border-black rounded-sm ${on ? 'bg-black' : ''}`}>
      {on && (
        <svg
          className="w-full h-full text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

// --- Totals ---------------------------------------------------------------

/**
 * Compact one-line money strip. Deliberately de-emphasized — the item rows
 * own the page; the dollar breakdown just rides along at the bottom.
 */
function TotalsBox({
  subtotal,
  discount,
  delivery,
  tax,
  total,
}: {
  subtotal: number;
  discount: number;
  delivery: number;
  tax: number;
  total: number;
}): ReactElement {
  return (
    <div className="mt-1 text-right text-xs text-gray-500">
      <span>Subtotal {formatCurrency(subtotal)}</span>
      {discount > 0 && <span> · Disc -{formatCurrency(discount)}</span>}
      <span> · Delivery {formatCurrency(delivery)}</span>
      <span> · Tax {formatCurrency(tax)}</span>
      <span className="font-bold text-gray-900"> · TOTAL {formatCurrency(total)}</span>
    </div>
  );
}

// --- Helpers --------------------------------------------------------------

/** Full customer name, trimmed, falling back to "Guest". */
function fullName(order: OrdersViewOrder): string {
  return (order.customerName || '').trim() || 'Guest';
}

/** "Thursday, Jun 18 · 4:30 PM - 5:00 PM" — UTC so stored dates don't shift. */
function bannerDateLine(order: OrdersViewOrder): string {
  const day = new Date(order.deliveryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return order.deliveryTime ? `${day} · ${order.deliveryTime}` : day;
}

/** True for the Rocky Hills / FM 2769 marina address (blue banner). */
function addrMarina(addrStr: string): boolean {
  const a = addrStr.toLowerCase();
  return a.includes('13993 fm 2769') || a.includes('rocky hills');
}

// --- Fit-to-one-page ------------------------------------------------------

/**
 * Approximate rendered height (px) of each block at the current print styles,
 * biased slightly HIGH so we shrink a touch too much rather than spill. These
 * are the knobs to turn if a real sheet still overflows (raise them) or prints
 * smaller than it needs to (lower them).
 */
const SHEET_PX = {
  // Letter is 11in − 0.6in margins ≈ 998px of usable height. We target well
  // below that: the estimate runs a little low in practice (a group sheet that
  // computed 0.91 still spilled its last line), so the budget carries the
  // safety margin — shrink a touch too much rather than spill.
  budget: 880,
  banner: 88,
  bannerAffiliate: 22,
  infoRow: 96, // customer / delivery / partner boxes (one shared row)
  groupBanner: 34,
  instructions: 40,
  note: 30,
  guestHeader: 30,
  tableHeader: 26,
  itemRow: 30, // text-sm row, biased high to cover titles that wrap to 2 lines
  bundleRow: 20,
  tableFooter: 30,
  totals: 24,
} as const;

/** Estimate a sheet's printed height from its contents (no DOM measurement). */
function estimateSheetPx(card: OrderCardData): number {
  const orders = card.orders;
  const isGroup = orders.length > 1;
  let h = SHEET_PX.banner;
  if (orders.some((o) => o.affiliate)) h += SHEET_PX.bannerAffiliate;
  h += SHEET_PX.infoRow;
  if (isGroup) h += SHEET_PX.groupBanner;
  if (!isGroup && orders[0].groupOrder) h += SHEET_PX.groupBanner;
  if (orders[0].deliveryInstructions) h += SHEET_PX.instructions;

  for (const o of orders) {
    if (isGroup) h += SHEET_PX.guestHeader;
    if (o.customerNote) h += SHEET_PX.note;
    if (o.internalNote) h += SHEET_PX.note;
    h += SHEET_PX.tableHeader;
    for (const item of o.items) {
      h += SHEET_PX.itemRow;
      h += (item.bundleComponents?.length ?? 0) * SHEET_PX.bundleRow;
    }
    h += SHEET_PX.tableFooter;
  }
  h += SHEET_PX.totals;
  return h;
}

/**
 * CSS `zoom` factor to keep a sheet on one page: 1 when it already fits,
 * otherwise just enough to fit, floored at 0.5 so a genuinely huge order
 * (~30+ items) stays legible and is allowed to spill rather than shrink away.
 */
function fitZoom(card: OrderCardData): number {
  const h = estimateSheetPx(card);
  if (h <= SHEET_PX.budget) return 1;
  return Math.max(0.5, Math.floor((SHEET_PX.budget / h) * 100) / 100);
}
