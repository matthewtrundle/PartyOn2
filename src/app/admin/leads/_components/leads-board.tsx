'use client';

import { ReactElement, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { BoardData, BoardLead } from '@/lib/leads/board-types';
import { PIPELINE_STAGES, isPipelineStage, type PipelineStage } from '@/lib/leads/pipeline-types';
import BoardColumn from './board-column';
import LeadCard from './lead-card';
import type { LeadMutations } from './use-lead-mutations';

/**
 * The Kanban surface: droppable column per stage + the optional
 * "Uncommitted" tray. Drops move stage optimistically and roll back if the
 * PATCH fails; Won/Lost drops confirm first (same rules as the drawer's
 * stage picker).
 */
export default function LeadsBoard({
  data,
  onOpen,
  mutations,
  optimisticMove,
  rollback,
}: {
  data: BoardData;
  onOpen: (id: string) => void;
  mutations: LeadMutations;
  optimisticMove: (leadId: string, to: PipelineStage) => void;
  rollback: () => void;
}): ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );
  const [dragging, setDragging] = useState(false);

  const findCard = (id: string): BoardLead | undefined =>
    [...Object.values(data.columns).flat(), ...data.tray].find((c) => c.id === id);

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    setDragging(false);
    const leadId = String(event.active.id);
    const target = event.over?.id;
    if (!target || !isPipelineStage(target)) return;
    const card = findCard(leadId);
    if (!card || card.stage === target) return;

    let lostReason: string | null = null;
    if (target === 'WON' && !window.confirm(`Mark ${card.name} as Won?`)) return;
    if (card.stage === 'WON' && !window.confirm(`Move ${card.name} OUT of Won?`)) return;
    if (target === 'LOST') {
      const input = window.prompt(`Why was ${card.name} lost? (optional)`, '');
      if (input === null) return;
      lostReason = input.trim() || null;
    }

    optimisticMove(leadId, target);
    const ok = await mutations.moveStage(leadId, target, { lostReason });
    if (!ok) rollback();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={() => setDragging(true)}
      onDragCancel={() => setDragging(false)}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <div
        className={`flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none ${
          dragging ? 'select-none' : ''
        }`}
      >
        {PIPELINE_STAGES.flatMap((stage) => {
          // Split NEW into Premier (cruise partner flood) + Ads & Direct so the
          // ad funnel is separable. Premier is a visual group only (drops into
          // it are ignored — a card's Premier-ness is data, not drop target);
          // the Ads & Direct column keeps the real NEW droppable.
          if (stage === 'NEW') {
            const premier = data.columns.NEW.filter((c) => c.isPremier);
            const adsDirect = data.columns.NEW.filter((c) => !c.isPremier);
            return [
              <BoardColumn
                key="NEW-premier"
                stage="NEW"
                droppableId="NEW-premier"
                title="New · Premier"
                subtitle="Cruise partner"
                accent="gold"
                cards={premier}
                onOpen={onOpen}
              />,
              <BoardColumn
                key="NEW"
                stage="NEW"
                title="New · Ads & Direct"
                subtitle="Everyone else — your ad funnel"
                cards={adsDirect}
                onOpen={onOpen}
              />,
            ];
          }
          return [
            <BoardColumn
              key={stage}
              stage={stage}
              cards={data.columns[stage]}
              totalCount={
                stage === 'WON'
                  ? data.closedCounts.won
                  : stage === 'LOST'
                    ? data.closedCounts.lost
                    : undefined
              }
              onOpen={onOpen}
            />,
          ];
        })}
      </div>

      {data.tray.length > 0 && (
        <section className="mt-2">
          <h2 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
            Uncommitted — typed an email but never finished ({data.tray.length})
          </h2>
          <p className="text-sm text-gray-400 mb-2">
            Drag one onto the board (or tap it) to start working it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {data.tray.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}
    </DndContext>
  );
}
