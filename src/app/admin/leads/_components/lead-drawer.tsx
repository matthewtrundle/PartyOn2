'use client';

import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import BottomSheet from '@/components/backend/kit/BottomSheet';
import HqBadge from '@/components/backend/kit/Badge';
import { PIPELINE_STAGES, type PipelineStage } from '@/lib/leads/pipeline-types';
import { STAGE_LABELS } from '@/lib/leads/board-types';
import { temperatureFor } from '@/lib/leads/scoring';
import type { LeadMutations } from './use-lead-mutations';
import type { LeadDetail } from './drawer-types';
import DrawerTimeline from './drawer-timeline';
import ReplyComposer from './reply-composer';

const TEMP_VARIANT = { hot: 'red', warm: 'amber', cold: 'gray' } as const;
const OWNERS = ['', 'Allan', 'Brian'];

/**
 * Card detail drawer — BottomSheet on all sizes (portaled, esc-closes).
 * Stage buttons confirm the destructive-feeling moves; Lost prompts for a
 * reason. The reply composer lands here in the follow-up PR.
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
  const temp = temperatureFor(lead?.leadScore ?? null);
  const name = lead ? [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Lead' : 'Lead';

  return (
    <BottomSheet open={leadId !== null} onClose={onClose} title={name}>
      <div className="px-4 pb-8 pt-2 max-h-[80vh] overflow-y-auto">
        {loading && !detail && <div className="py-10 text-center text-gray-400">Loading…</div>}
        {lead && (
          <>
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-2xl tracking-[0.05em] text-gray-900">
                  {name}
                </h2>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="text-brand-blue underline">
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="text-brand-blue underline">
                      {lead.phone}
                    </a>
                  )}
                  <a
                    href="https://app.gohighlevel.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-500 underline"
                    title="SMS lives in GHL until the CRM cutover"
                  >
                    Open GHL
                  </a>
                </div>
              </div>
              {temp && (
                <HqBadge variant={TEMP_VARIANT[temp]}>
                  {temp} {lead.leadScore}
                </HqBadge>
              )}
            </header>

            <section className="mt-4">
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => void moveTo(stage)}
                    disabled={mutations.mutating}
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

            <section className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Fact label="Source" value={`${lead.sourceWidget ?? '—'}${lead.sourcePage ? ` · ${lead.sourcePage}` : ''}`} />
              <Fact label="Campaign" value={lead.utmCampaign ?? lead.utmSource ?? 'direct / unknown'} />
              <Fact
                label="Score breakdown"
                value={
                  lead.scoreBreakdown
                    ? Object.entries(lead.scoreBreakdown)
                        .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()} ${v}`)
                        .join(' · ')
                    : '—'
                }
              />
              <Fact label="Created" value={new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
            </section>

            <section className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <label className="text-gray-600 font-semibold text-base">Owner</label>
              <select
                value={lead.owner ?? ''}
                onChange={(e) => void setOwner(e.target.value)}
                className="min-h-[36px] rounded-lg border border-gray-300 px-2 text-base"
              >
                {OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o || 'Unassigned'}
                  </option>
                ))}
              </select>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={() => void snooze(3)} className="btn-ghost min-h-[36px]">
                Snooze 3d
              </button>
              <button type="button" onClick={() => void snooze(7)} className="btn-ghost min-h-[36px]">
                Snooze 7d
              </button>
              {lead.snoozedUntil && new Date(lead.snoozedUntil) > new Date() && (
                <button type="button" onClick={() => void snooze(null)} className="btn-ghost min-h-[36px] text-red-600">
                  Un-snooze
                </button>
              )}
            </section>

            {(detail.orders.length > 0 || detail.drafts.length > 0) && (
              <section className="mt-4">
                <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
                  Orders & quotes
                </h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {detail.orders.map((o) => (
                    <li key={o.id}>
                      <a href={`/ops/orders/${o.id}`} className="text-brand-blue underline">
                        Order #{o.orderNumber}
                      </a>{' '}
                      · ${o.total.toFixed(0)}
                      {o.isGroupParticipant && (
                        <span className="text-gray-500"> · group payment (possible win — confirm)</span>
                      )}
                    </li>
                  ))}
                  {detail.drafts.map((d) => (
                    <li key={d.id} className="text-gray-700">
                      Invoice {d.status.toLowerCase()} · ${Number(d.total).toFixed(0)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

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

function Fact({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</div>
      <div className="text-gray-800 break-words">{value}</div>
    </div>
  );
}
