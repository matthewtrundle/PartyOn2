'use client';

import React, { ReactElement } from 'react';
import { formatAddress, formatCurrency } from '../format';
import { loadCachedChecks } from '../usePickChecks';
import type { OrderCardData, OrdersViewOrder } from '@/lib/ops/orders-view-data';

/**
 * Print-only pick sheets: one sheet (page) per cooler card.
 *
 * - Solo orders print the classic single-order sheet.
 * - Group dashboards (a shareCode shared across several payers) print ONE
 *   combined sheet: a shared banner + delivery/partner block, then a per-guest
 *   item checklist for each order, and combined money totals. Page breaks fall
 *   only between cards, never between guests of the same group.
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
      {cards.map((card, idx) => (
        <div
          key={card.key}
          className={`order-sheet ${idx > 0 ? 'break-before-page' : ''}`}
          style={idx > 0 ? { pageBreakBefore: 'always' } : undefined}
        >
          {card.orders.length > 1 ? (
            <GroupSheet card={card} />
          ) : (
            <SoloSheet order={card.orders[0]} />
          )}
        </div>
      ))}
    </>
  );
}

// --- Sheets ---------------------------------------------------------------

/** One payer / direct order — the familiar single-order pick sheet. */
function SoloSheet({ order }: { order: OrdersViewOrder }): ReactElement {
  const addrStr = order.deliveryAddress ? formatAddress(order.deliveryAddress) : '';
  return (
    <>
      <SheetBanner
        orderNumber={`#${order.orderNumber}`}
        name={fullName(order)}
        dateLine={bannerDateLine(order)}
        affiliate={order.affiliate?.businessName}
        marina={addrMarina(addrStr)}
      />

      {order.groupOrder && (
        <div className="mb-3 px-2 py-1.5 border-2 border-blue-500 bg-blue-50 rounded text-sm font-bold">
          Group Order: {order.groupOrder.name || order.groupOrder.shareCode}
        </div>
      )}

      <div className="flex gap-3 mb-3">
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
function GroupSheet({ card }: { card: OrderCardData }): ReactElement {
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
      />

      <div className="mb-3 px-2 py-1.5 border-2 border-blue-500 bg-blue-50 rounded text-sm font-bold flex flex-wrap justify-between gap-x-4">
        <span>
          Group: {card.dashboard?.name || card.displayName}
          {card.shareCode ? ` · ${card.shareCode}` : ''}
        </span>
        <span className="text-blue-700">
          {orders.length} orders · {orders.map((o) => `#${o.orderNumber}`).join('  ')}
        </span>
      </div>

      <div className="flex gap-3 mb-3">
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
    <div className="mb-4 break-inside-avoid">
      <div className="flex items-baseline justify-between border-b-2 border-gray-800 pb-1 mb-1.5">
        <div className="text-xl font-black tracking-tight">
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
}: {
  orderNumber?: string;
  name: string;
  dateLine: string;
  affiliate?: string;
  marina: boolean;
}): ReactElement {
  return (
    <div
      className={`rounded-lg px-4 py-3 mb-3 ${marina ? 'bg-blue-600 text-white' : 'bg-yellow-400 text-black'}`}
    >
      <div className="flex items-baseline gap-3 flex-wrap leading-none">
        {orderNumber && (
          <span className="text-[52px] font-black tracking-tight whitespace-nowrap">{orderNumber}</span>
        )}
        <span className="text-[46px] font-black tracking-tight break-words">{name}</span>
      </div>
      <div className="text-3xl font-bold leading-none mt-2">{dateLine}</div>
      {affiliate && (
        <div className="flex justify-end mt-1">
          <span className="text-xl font-semibold opacity-85">{affiliate}</span>
        </div>
      )}
    </div>
  );
}

function CustomerBox({ order }: { order: OrdersViewOrder }): ReactElement {
  return (
    <div className="flex-1 border border-gray-400 rounded p-2">
      <BoxHeading>Customer</BoxHeading>
      <div className="font-bold text-sm">{order.customerName}</div>
      <div className="text-sm">{order.customerEmail}</div>
      {order.customerPhone && <div className="text-sm">Tel: {order.customerPhone}</div>}
    </div>
  );
}

function DeliveryBox({ order, addrStr }: { order: OrdersViewOrder; addrStr: string }): ReactElement {
  return (
    <div className="flex-1 border border-gray-400 rounded p-2">
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
    <div className="flex-1 border border-gray-400 rounded p-2">
      <BoxHeading>Partner</BoxHeading>
      <div className="font-bold text-sm">{affiliate.businessName}</div>
      <div className="text-sm">{affiliate.contactName}</div>
      {affiliate.phone && <div className="text-sm">Tel: {affiliate.phone}</div>}
    </div>
  );
}

function BoxHeading({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">
      {children}
    </div>
  );
}

function InstructionsBox({ text }: { text: string }): ReactElement {
  return (
    <div className="mb-3 px-2 py-1.5 border-2 border-yellow-500 bg-yellow-50 rounded text-sm">
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
    <table className="w-full mb-3 border-collapse text-lg">
      <thead>
        <tr className="border-b-2 border-black">
          <th className="text-left py-1 px-2 font-bold">Item</th>
          <th className="text-center py-1 px-2 w-14 font-bold">Qty</th>
          <th className="text-center py-1 w-20 font-bold">In Stock?</th>
          <th className="text-center py-1 w-20 font-bold">Packed?</th>
          <th className="text-center py-1 w-20 font-bold">Short By</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item, idx) => (
          <React.Fragment key={idx}>
            <tr className="border-b border-gray-300">
              <td className="py-1 px-2">
                <span className="font-medium">{item.title}</span>
              </td>
              <td className="text-center py-1 px-2 font-bold text-xl">{item.quantity}</td>
              <td className="text-center py-1">
                <PickBox on={!!checks[item.title]?.inStock} />
              </td>
              <td className="text-center py-1">
                <PickBox on={!!checks[item.title]?.packed} />
              </td>
              <td className="text-center py-1 font-bold text-xl">
                {checks[item.title]?.shortBy || ''}
              </td>
            </tr>
            {item.bundleComponents?.map((bc, bcIdx) => {
              const bcKey = `${item.title}::${bc.title}`;
              return (
                <tr key={`${idx}-bc-${bcIdx}`} className="border-b border-gray-200">
                  <td className="py-0.5 pl-6 pr-2 text-gray-500 text-[15px]">
                    |- {bc.title}
                    {bc.variantTitle && bc.variantTitle !== 'Default Title' && ` (${bc.variantTitle})`}
                  </td>
                  <td className="text-center py-0.5 text-base font-semibold text-gray-500">
                    {item.quantity * bc.quantity}
                  </td>
                  <td className="text-center py-0.5">
                    <PickBox on={!!checks[bcKey]?.inStock} small />
                  </td>
                  <td className="text-center py-0.5">
                    <PickBox on={!!checks[bcKey]?.packed} small />
                  </td>
                  <td className="text-center py-0.5 text-base font-semibold text-gray-500">
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
          <td className="py-1.5 px-2 font-bold">
            Total Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
          </td>
          <td></td>
          <td colSpan={3} className="text-center py-1.5">
            <span className="font-bold text-sm mr-1">Order Complete?</span>
            <span className="inline-block w-6 h-6 border-2 border-black rounded-sm align-middle"></span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** A printed checkbox, filled black with a white tick when `on`. */
function PickBox({ on, small }: { on: boolean; small?: boolean }): ReactElement {
  const size = small ? 'w-[18px] h-[18px] border-[1.5px]' : 'w-5 h-5 border-2';
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
    <div className="w-48 border border-gray-400 rounded overflow-hidden text-sm ml-auto">
      <TotalsRow label="Subtotal" value={formatCurrency(subtotal)} />
      {discount > 0 && <TotalsRow label="Discount" value={`-${formatCurrency(discount)}`} />}
      <TotalsRow label="Delivery" value={formatCurrency(delivery)} />
      <TotalsRow label="Tax" value={formatCurrency(tax)} />
      <div className="flex justify-between py-1 px-2 bg-gray-100 font-bold text-base">
        <span>TOTAL</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function TotalsRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
      <span>{label}</span>
      <span>{value}</span>
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
