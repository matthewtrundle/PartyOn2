'use client';

import { ReactElement } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { BoardLead } from '@/lib/leads/board-types';
import type { PipelineStage } from '@/lib/leads/pipeline-types';
import { STAGE_LABELS } from '@/lib/leads/board-types';
import LeadCard from './lead-card';

const HEADER_TONES: Record<PipelineStage, string> = {
  NEW: 'text-brand-blue',
  CONTACTED: 'text-sky-700',
  QUALIFIED: 'text-indigo-700',
  QUOTE_SENT: 'text-amber-700',
  WON: 'text-green-700',
  LOST: 'text-gray-500',
};

/** One droppable Kanban column. Scroll-snap target on mobile. */
export default function BoardColumn({
  stage,
  cards,
  totalCount,
  onOpen,
  title,
  subtitle,
  droppableId,
  accent,
}: {
  stage: PipelineStage;
  cards: BoardLead[];
  /** For Won/Lost: all-time count when the column is 30d-capped. */
  totalCount?: number;
  onOpen: (id: string) => void;
  /** Override the header label (used to split NEW into Premier / Ads & Direct). */
  title?: string;
  /** Small muted line under the header. */
  subtitle?: string;
  /** Droppable id — defaults to `stage`. A non-stage id (e.g. the Premier
      split) makes the column a visual group only: drags OUT still work, but
      drops INTO it are ignored by the board (isPipelineStage === false). */
  droppableId?: string;
  /** 'gold' tints the header for the Premier partner column. */
  accent?: 'gold';
}): ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId ?? stage });
  const isClosed = stage === 'WON' || stage === 'LOST';

  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col w-[280px] md:w-[300px] shrink-0 snap-start rounded-xl border ${
        isOver ? 'border-brand-blue bg-blue-50/60' : 'border-gray-200 bg-gray-50'
      } transition-colors`}
      aria-label={`${STAGE_LABELS[stage]} column`}
    >
      <header className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="min-w-0">
          <h2
            className={`font-heading font-bold text-sm tracking-[0.1em] uppercase ${
              accent === 'gold' ? 'text-gold' : HEADER_TONES[stage]
            }`}
          >
            {title ?? STAGE_LABELS[stage]}
          </h2>
          {subtitle && <p className="text-xs text-gray-400 tracking-[0.03em]">{subtitle}</p>}
        </div>
        <span className="text-sm font-semibold text-gray-500 shrink-0">
          {cards.length}
          {isClosed && totalCount != null && totalCount > cards.length
            ? ` / ${totalCount}`
            : ''}
        </span>
      </header>
      <div className="flex flex-col gap-2 px-2 pb-2 overflow-y-auto min-h-[120px] max-h-[calc(100vh-320px)]">
        {cards.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />
        ))}
        {cards.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg m-1">
            {isClosed ? `No ${STAGE_LABELS[stage].toLowerCase()} in 30d` : 'Drop leads here'}
          </div>
        )}
      </div>
    </section>
  );
}
