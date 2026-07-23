'use client';

import { ReactElement } from 'react';
import { PIPELINE_STAGES, type PipelineStage } from '@/lib/leads/pipeline-types';
import { STAGE_LABELS } from '@/lib/leads/board-types';
import type { LeadDetail } from './drawer-types';

const OWNERS = ['', 'Allan', 'Brian'];

/**
 * Drawer action rows: the stage picker plus owner/snooze controls. Purely
 * presentational — confirmation prompts and the PATCH calls live in the
 * drawer's handlers.
 */
export default function DrawerStageActions({
  lead,
  mutating,
  onMove,
  onSetOwner,
  onSnooze,
  onLogTouch,
}: {
  lead: LeadDetail['lead'];
  mutating: boolean;
  onMove: (stage: PipelineStage) => void;
  onSetOwner: (owner: string) => void;
  onSnooze: (days: number | null) => void;
  onLogTouch: (channel: 'call' | 'text') => void;
}): ReactElement {
  const snoozed = lead.snoozedUntil && new Date(lead.snoozedUntil) > new Date();
  return (
    <>
      <section className="mt-4">
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => onMove(stage)}
              disabled={mutating}
              className={`min-h-[36px] px-3 rounded-lg text-sm font-semibold tracking-[0.05em] border transition-colors ${
                lead.pipelineStage === stage
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-blue'
              }`}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <label className="text-gray-600 font-semibold text-base">Owner</label>
        <select
          value={lead.owner ?? ''}
          onChange={(e) => onSetOwner(e.target.value)}
          className="min-h-[36px] rounded-lg border border-gray-300 px-2 text-base"
        >
          {OWNERS.map((o) => (
            <option key={o} value={o}>
              {o || 'Unassigned'}
            </option>
          ))}
        </select>
        <span className="text-gray-300">|</span>
        <button type="button" onClick={() => onSnooze(3)} className="btn-ghost min-h-[36px]">
          Snooze 3d
        </button>
        <button type="button" onClick={() => onSnooze(7)} className="btn-ghost min-h-[36px]">
          Snooze 7d
        </button>
        {snoozed && (
          <button type="button" onClick={() => onSnooze(null)} className="btn-ghost min-h-[36px] text-red-600">
            Un-snooze
          </button>
        )}
      </section>

      {/* Log an off-board outreach attempt — records the touch, clears the
          reply flag, and moves NEW→CONTACTED (the actual call/text happens in
          the phone / GHL; this is the bookkeeping). */}
      <section className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500 font-semibold">Log outreach</span>
        <button
          type="button"
          onClick={() => onLogTouch('call')}
          disabled={mutating}
          className="min-h-[36px] rounded-lg border border-gray-300 bg-white px-3 font-semibold text-gray-700 hover:border-brand-blue"
        >
          Logged call
        </button>
        <button
          type="button"
          onClick={() => onLogTouch('text')}
          disabled={mutating}
          className="min-h-[36px] rounded-lg border border-gray-300 bg-white px-3 font-semibold text-gray-700 hover:border-brand-blue"
        >
          Logged text
        </button>
      </section>
    </>
  );
}
