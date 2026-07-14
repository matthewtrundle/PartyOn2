'use client';

import { ReactElement } from 'react';
import { useDraggable } from '@dnd-kit/core';
import HqBadge from '@/components/backend/kit/Badge';
import type { BoardLead } from '@/lib/leads/board-types';
import { SOURCE_LABELS } from '@/lib/leads/board-types';
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

/**
 * One Kanban card. Draggable on desktop (pointer, 8px threshold) and via
 * long-press on touch; tap opens the drawer (dnd-kit only claims the pointer
 * once the drag threshold is passed, so click stays intact).
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

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpen(lead.id)}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative w-full text-left bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow touch-manipulation ${
        isDragging ? 'opacity-90 shadow-lg ring-2 ring-brand-blue' : ''
      } ${snoozed ? 'opacity-55' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {lead.needsResponse && (
              <span
                className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                title="Waiting on a reply"
              />
            )}
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

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-400 uppercase tracking-[0.05em] font-semibold">
          {SOURCE_LABELS[lead.sourceWidget ?? ''] ?? 'Site'}
        </span>
        <span className="flex items-center gap-1.5">
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
    </button>
  );
}
