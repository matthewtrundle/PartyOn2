'use client';

import { KeyboardEvent, MouseEvent, PointerEvent, ReactElement } from 'react';
import { useDraggable } from '@dnd-kit/core';
import HqBadge from '@/components/backend/kit/Badge';
import type { BoardLead } from '@/lib/leads/board-types';
import { daysUntilCT } from '@/lib/leads/scoring';

// Countdown uses the shared CT-safe date math (scoring.ts) — the business
// runs on America/Chicago days, not the viewer's browser timezone.
function eventChip(eventDate: string | null): string | null {
  if (!eventDate) return null;
  const days = daysUntilCT(eventDate, new Date());
  if (days == null) return null;
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days}d`;
}

const TEMP_VARIANT = { hot: 'red', warm: 'amber', cold: 'gray' } as const;

const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** Small partner/affiliate mark (SVG per repo rules — no emoji in UI). */
function PartnerIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 19c.8-3 3.4-5 6.5-5s5.7 2 6.5 5" />
      <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M17.8 14.2c1.9.7 3.3 2.3 3.7 4.8" />
    </svg>
  );
}

const ACTION_ICON: Record<'CALL' | 'TEXT' | 'EMAIL', ReactElement> = {
  CALL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  ),
  TEXT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  EMAIL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
};

const ACTION_STYLE: Record<'CALL' | 'TEXT' | 'EMAIL', string> = {
  CALL: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  TEXT: 'bg-blue-50 text-brand-blue border-blue-200 hover:bg-blue-100',
  EMAIL: 'bg-gray-50 text-gray-600 border-gray-200',
};

/**
 * Next-best-action chip: the "what do I do now" answer. CALL dials via tel:,
 * TEXT deep-links to GHL (SMS lives there until the A2P number lands); EMAIL
 * just opens the drawer (the card's own click). REPLY is intentionally not
 * rendered here — the red "Reply needed" tag already carries that signal.
 */
function NextActionChip({
  action,
  phone,
  stop,
}: {
  action: NonNullable<BoardLead['nextAction']>;
  phone: string | null;
  stop: (e: MouseEvent | PointerEvent) => void;
}): ReactElement | null {
  if (action.kind === 'REPLY') return null;
  const cls = `inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold tracking-[0.03em] ${ACTION_STYLE[action.kind]}`;
  const inner = (
    <>
      {ACTION_ICON[action.kind]}
      <span className="truncate">{action.reason}</span>
    </>
  );
  if (action.kind === 'CALL' && phone) {
    return (
      <a href={`tel:${phone}`} onClick={stop} onPointerDown={stop} className={cls}>
        {inner}
      </a>
    );
  }
  if (action.kind === 'TEXT') {
    return (
      <a
        href="https://app.gohighlevel.com"
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        onPointerDown={stop}
        title="SMS lives in GHL until the CRM cutover"
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return <span className={cls}>{inner}</span>;
}

/**
 * One Kanban card. Draggable on desktop (pointer, 8px threshold) and via
 * long-press on touch; tap opens the drawer. Root is a div (not a button):
 * the tile contains real anchors (dashboard link) and nested interactive
 * content inside a <button> is invalid HTML. dnd-kit's `attributes` supply
 * role="button" + tabIndex; Enter/Space open the drawer to match.
 *
 * Scan order is deliberate (operator works hot→cold top-down): WHO → HOW HOT
 * → WHAT/WHEN → MONEY IN CART → SOURCE + BADGES. Color only ever carries
 * meaning: red = act now, temperature tint = heat, green = cart money,
 * brand yellow = affiliate flag, blue = paid traffic.
 */
export default function LeadCard({
  lead,
  onOpen,
}: {
  lead: BoardLead;
  onOpen: (id: string) => void;
}): ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const chip = eventChip(lead.eventDate);
  const snoozed = lead.snoozedUntil && new Date(lead.snoozedUntil) > new Date();
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 }
    : undefined;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(lead.id);
    }
  };
  // Keep the dashboard link a plain link: don't open the drawer, and don't
  // let the pointer sensor claim the press as a drag start.
  const stop = (e: MouseEvent | PointerEvent): void => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      onClick={() => onOpen(lead.id)}
      onKeyDown={onKeyDown}
      style={style}
      {...listeners}
      {...attributes}
      // shrink-0 is load-bearing: as a flex child of the column's overflow-y
      // scroller, overflow-hidden alone drops the min-height:auto content
      // floor, letting a tall column compress every card to its top band —
      // the "wall of red bars" regression (#295).
      className={`relative w-full shrink-0 cursor-pointer text-left rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow touch-manipulation overflow-hidden ${
        lead.stalled ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-200'
      } ${isDragging ? 'opacity-90 shadow-lg ring-2 ring-brand-blue' : ''} ${
        snoozed ? 'opacity-55' : ''
      }`}
    >
      {lead.needsResponse && (
        // Compact act-now tag (solid red per the HQ badge spec), not a
        // full-bleed bar — the tile body must always stay readable.
        <div className="mb-2 flex">
          <span className="inline-flex items-center gap-1.5 rounded bg-red-500 px-2 py-[3px] text-xs font-bold uppercase tracking-[0.05em] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Reply needed
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-gray-900 truncate">{lead.name}</span>
          </div>
          <div className="text-sm text-gray-500 truncate">
            {lead.email ?? lead.phone ?? '—'}
          </div>
        </div>
        {lead.temperature && (
          <HqBadge variant={TEMP_VARIANT[lead.temperature]}>
            {lead.temperature}
            {lead.score != null ? ` ${lead.score}` : ''}
          </HqBadge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
        {lead.occasion && <span className="capitalize">{lead.occasion.replace(/-/g, ' ')}</span>}
        {chip && (
          <span className={chip.endsWith('ago') ? 'text-gray-400' : 'text-brand-blue font-medium'}>
            {chip}
          </span>
        )}
        {lead.headcount != null && <span>{lead.headcount} ppl</span>}
        {lead.budgetPerPerson != null && <span>${lead.budgetPerPerson}/pp</span>}
      </div>

      {lead.cart && (
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          {lead.cart.itemCount > 0 ? (
            <span className="font-semibold text-green-700">
              {money(lead.cart.total)}
              <span className="font-normal text-gray-500">
                {' '}· {lead.cart.itemCount} item{lead.cart.itemCount === 1 ? '' : 's'}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">Empty cart</span>
          )}
          <a
            href={`/dashboard/${lead.cart.shareCode}`}
            target="_blank"
            rel="noreferrer"
            onClick={stop}
            onPointerDown={stop}
            className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline"
          >
            Dashboard
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      )}

      {lead.nextAction && lead.nextAction.kind !== 'REPLY' && (
        <div className="mt-2 flex">
          <NextActionChip action={lead.nextAction} phone={lead.phone} stop={stop} />
        </div>
      )}

      {(lead.daysInStage != null || lead.touchCount > 0 || lead.suggestLost) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
          {lead.daysInStage != null && (
            <span className={lead.stalled ? 'font-semibold text-amber-600' : ''}>
              {lead.daysInStage}d in stage
            </span>
          )}
          {lead.touchCount > 0 && (
            <span>
              {lead.touchCount} touch{lead.touchCount === 1 ? '' : 'es'}
            </span>
          )}
          {lead.suggestLost && <span className="text-gray-500">· suggest Lost</span>}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-400 uppercase tracking-[0.05em] font-semibold truncate">
          {lead.sourceLabel}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {lead.adsClick && <HqBadge variant="blue">Ads</HqBadge>}
          {lead.affiliate && (
            <HqBadge variant="brand" className="max-w-[120px]">
              <span className="truncate">{lead.affiliate.name}</span>
            </HqBadge>
          )}
          {lead.tags.includes('partner-active') ? (
            <HqBadge variant="green">
              <PartnerIcon />
              <span className="ml-1">Active Partner</span>
            </HqBadge>
          ) : lead.tags.includes('partner-prospect') ? (
            <HqBadge variant="blue">
              <PartnerIcon />
              <span className="ml-1">Partner</span>
            </HqBadge>
          ) : null}
          {lead.isDuplicate && <HqBadge variant="gray">dupe</HqBadge>}
          {lead.hasFollowUp && (
            <span title="Automated follow-up scheduled/sent" aria-label="Follow-up scheduled">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
          )}
          {lead.owner && <span className="text-gray-500 font-medium">{lead.owner}</span>}
        </span>
      </div>
    </div>
  );
}
