'use client';

import { ReactElement, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import { extractLeadFacts } from '@/lib/leads/scoring';
import { type PipelineStage } from '@/lib/leads/pipeline-types';
import type { LeadMutations } from './use-lead-mutations';
import type { LeadDetail } from './drawer-types';
import { readDetail, writeDetail } from './lead-detail-cache';
import DrawerHeader from './drawer-header';
import DrawerSummary from './drawer-summary';
import DrawerStageActions from './drawer-stage-actions';
import DrawerFacts from './drawer-facts';
import DrawerSubmission from './drawer-submission';
import DrawerCart from './drawer-cart';
import DrawerInbound from './drawer-inbound';
import DrawerConversation from './drawer-conversation';
import DrawerTimeline from './drawer-timeline';
import ReplyComposer from './reply-composer';

/**
 * Card detail drawer — BottomSheet on all sizes (portaled, esc-closes).
 * Owns the detail fetch + mutation handlers; the header/actions/facts
 * sections are presentational children. Stage buttons confirm the
 * destructive-feeling moves; Lost prompts for a reason. Includes the 1:1
 * email reply composer.
 *
 * `banner` and `onReplySent` exist for the work queue: it renders its progress
 * bar above the header and takes over what "sent" means (advance, don't reload).
 */
export default function LeadDrawer({
  leadId,
  onClose,
  mutations,
  banner,
  onReplySent,
  onConfirmed,
}: {
  leadId: string | null;
  onClose: () => void;
  mutations: LeadMutations;
  banner?: ReactNode;
  onReplySent?: () => void;
  onConfirmed?: (leadId: string) => void;
}): ReactElement | null {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  // WHICH lead's fetch has come back — not a bare boolean. A card painted from
  // the prefetch cache is readable immediately, but acting on it waits for
  // confirmation, or a stale snapshot could be marked Lost.
  //
  // It stores the id rather than a flag because a flag leaks across cards: on a
  // lead change both effects below run in the same pass, so the announce effect
  // would still see the PREVIOUS card's `true` alongside the new id and arm the
  // new card instantly. Comparing ids makes that unrepresentable, and also makes
  // a late out-of-order fetch resolve harmlessly against the card it belongs to.
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
  const confirmed = confirmedFor !== null && confirmedFor === leadId;
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
        if (body.data) writeDetail(leadId, body.data);
        // leadId is the one this callback fetched for, so a slow response can
        // never confirm whichever card the operator has moved on to.
        setConfirmedFor(leadId);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Stale-while-revalidate: paint a prefetched lead instantly (the queue warms
  // the next one), then always refetch so what's on screen converges on truth.
  useEffect(() => {
    const cached = leadId ? readDetail(leadId) : null;
    setDetail(cached);
    // No reset needed — `confirmed` is derived by comparing ids, so the previous
    // card's confirmation stops applying the moment leadId changes.
    if (cached) setNotes(cached.lead.notes ?? '');
    void load();
  }, [leadId, load]);

  // Tell the queue this lead is confirmed fresh, so it can arm its own actions.
  // Held in a ref so a caller passing an inline function can't churn load()'s deps.
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  useEffect(() => {
    if (confirmed && leadId) onConfirmedRef.current?.(leadId);
  }, [confirmed, leadId]);

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

  const logTouch = async (channel: 'call' | 'text'): Promise<void> => {
    if (!leadId) return;
    const ok = await mutations.logTouch(leadId, channel);
    if (ok) void load();
  };

  if (!leadId) return null;
  const lead = detail?.lead;
  const name = lead ? [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Lead' : 'Lead';

  return (
    // centered: contained pop-up with a visible X — a full-height sheet read
    // as an inescapable takeover (operator feedback 2026-07-14). The sheet
    // owns scrolling, so no inner max-h/overflow here.
    <BottomSheet open={leadId !== null} onClose={onClose} title={name} centered>
      <div className="px-4 pb-8 pt-2">
        {loading && !detail && <div className="py-10 text-center text-gray-400">Loading…</div>}
        {lead && detail && (
          <>
            {banner}
            <DrawerHeader lead={lead} name={name} />
            <DrawerSummary detail={detail} />
            <DrawerStageActions
              lead={lead}
              mutating={mutations.mutating || !confirmed}
              onMove={(stage) => void moveTo(stage)}
              onSetOwner={(owner) => void setOwner(owner)}
              onSnooze={(days) => void snooze(days)}
              onLogTouch={(channel) => void logTouch(channel)}
            />
            <DrawerFacts detail={detail} />
            <DrawerSubmission metadata={lead.metadata} />
            <DrawerCart cart={detail.cart} />
            <DrawerInbound inboundEmails={detail.inboundEmails} />
            <DrawerConversation chatConversations={detail.chatConversations} />

            <section className="mt-4">
              <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
                Reply by email
              </h3>
              <div className="mt-2">
                <ReplyComposer
                  key={lead.id}
                  leadId={lead.id}
                  leadEmail={lead.email}
                  firstName={lead.firstName}
                  sourceWidget={lead.sourceWidget}
                  occasion={extractLeadFacts(lead.metadata).occasion}
                  inbound={detail.inboundEmails[0] ?? null}
                  onSent={onReplySent ?? (() => void load())}
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
