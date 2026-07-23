'use client';

import { ReactElement } from 'react';
import HqBadge from '@/components/backend/kit/Badge';
import type { LeadDetail } from './drawer-types';

const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Party-dashboard cart section: what's sitting in the lead's group cart
 * right now — the "how serious are they" read before a call. OPEN = guests
 * can still join/order; LOCKED = the host closed joining (group.status
 * stays ACTIVE either way, so the first-tab status is the truthful one).
 */
export default function DrawerCart({
  cart,
}: {
  cart: LeadDetail['cart'];
}): ReactElement | null {
  if (!cart) return null;

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
          Party dashboard
        </h3>
        <span className="flex items-center gap-2">
          {cart.status && (
            <HqBadge variant={cart.status === 'OPEN' ? 'green' : 'gray'}>{cart.status}</HqBadge>
          )}
          <a
            href={`/dashboard/${cart.shareCode}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
          >
            Open
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </span>
      </div>

      <div className="mt-1 text-sm text-gray-500">
        {cart.participantCount} participant{cart.participantCount === 1 ? '' : 's'}
        {cart.deliveryDate ? ` · delivery ${cart.deliveryDate.slice(0, 10)}` : ''}
        {cart.affiliateName ? ` · via ${cart.affiliateName}` : ''}
      </div>

      {cart.items.length === 0 ? (
        <div className="mt-2 text-sm text-gray-400">Cart is empty so far.</div>
      ) : (
        <>
          <ul className="mt-2 space-y-1 text-sm text-gray-800">
            {cart.items.map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {item.quantity} × {item.title}
                  {item.variantTitle ? (
                    <span className="text-gray-500"> — {item.variantTitle}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums">{money(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-gray-200 pt-2 text-sm">
            <span className="font-semibold uppercase tracking-[0.05em] text-gray-500">
              Cart total
            </span>
            <span className="font-semibold text-green-700 tabular-nums">{money(cart.total)}</span>
          </div>
        </>
      )}
    </section>
  );
}
