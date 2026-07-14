'use client';

import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import { type PipelineStage } from '@/lib/leads/pipeline-types';
import type { LeadMutations } from './use-lead-mutations';
import type { LeadDetail } from './drawer-types';
import DrawerHeader from './drawer-header';
import DrawerStageActions from './drawer-stage-actions';
import DrawerFacts from './drawer-facts';
import DrawerTimeline from './drawer-timeline';
import ReplyComposer from './reply-composer';

/**
 * Card detail drawer — BottomSheet on all sizes (portaled, esc-closes).
 * Owns the detail fetch + mutation handlers; the header/actions/facts
 * sections are presentational children. Stage buttons confirm the
 * destructive-feeling moves; Lost prompts for a reason. Includes the 1:1
 * email reply composer.
 */
export default function LeadDrawer({
  leadId,
  onClose,
  mutations,
}: {
  leadId: string | null;
  onClose: () => void;
  mutations: LeadMutations;
}): ReactElement | null {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/leads/${leadId}`);
      if (res.ok) {
        const body = await res.json();
        setDetail(body.data);
        setNotes(body.data?.lead?.notes ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  const saveNotes = (value: string): void => {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (leadId) void mutations.patchLead(leadId, { notes: value });
    }, 800);
  };

  const moveTo = async (stage: PipelineStage): Promise<void> => {
    if (!detail || !leadId) return;
    const from = detail.lead.pipelineStage;
    if (from === stage) return;
    let lostReason: string | null = null;
    if (stage === 'WON' && !window.confirm('Mark this lead as Won?')) return;
    if (from === 'WON' && !window.confirm('Move this lead OUT of Won?')) return;
    if (stage === 'LOST') {
      const input = window.prompt('Why was this lead lost? (optional)', '');
      if (input === null) return;
      lostReason = input.trim() || null;
    }
    const ok = await mutations.moveStage(leadId, stage, { lostReason });
    if (ok) void load();
  };

  const snooze = async (days: number | null): Promise<void> => {
    if (!leadId) return;
    const until = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
    const ok = await mutations.patchLead(leadId, { snoozedUntil: until });
    if (ok) void load();
  };

  const setOwner = async (owner: string): Promise<void> => {
    if (!leadId) return;
    const ok = await mutations.patchLead(leadId, { owner: owner || null });
    if (ok) void load();
  };

  if (!leadId) return null;
  const lead = detail?.lead;
  const name = lead ? [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Lead' : 'Lead';

  return (
    <BottomSheet open={leadId !== null} onClose={onClose} title={name}>
      <div className="px-4 pb-8 pt-2 max-h-[80vh] overflow-y-auto">
        {loading && !detail && <div className="py-10 text-center text-gray-400">Loading…</div>}
        {lead && detail && (
          <>
            <DrawerHeader lead={lead} name={name} />
            <DrawerStageActions
              lead={lead}
              mutating={mutations.mutating}
              onMove={(stage) => void moveTo(stage)}
              onSetOwner={(owner) => void setOwner(owner)}
              onSnooze={(days) => void snooze(days)}
            />
            <DrawerFacts detail={detail} />

            <section className="mt-4">
              <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
                Reply by email
              </h3>
              <div className="mt-2">
                <ReplyComposer
                  leadId={lead.id}
                  leadEmail={lead.email}
                  defaultSubject="Your Party On Delivery inquiry"
                  onSent={() => void load()}
                />
              </div>
            </section>

            <section className="mt-4">
              <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
                Notes
              </h3>
              <textarea
                value={notes}
                onChange={(e) => saveNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes — autosaves"
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-base"
              />
            </section>

            <section className="mt-4">
              <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
                Timeline
              </h3>
              <div className="mt-2">
                <DrawerTimeline detail={detail} />
              </div>
            </section>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
