'use client';

/**
 * Lead Flow — the Kanban lead pipeline (/admin/leads).
 *
 * Every submitted lead lands here as a card: New → Contacted → Qualified →
 * Quote Sent → Won → Lost, scored cold/warm/hot. Deep-linkable via
 * ?lead=<id> (the URL GHL notifications carry). Data loads on open and after
 * every mutation (no background poll); a request-sequence guard drops
 * out-of-order responses, and a failed stage move re-syncs from the server
 * rather than restoring a possibly-stale snapshot.
 */

import { ReactElement, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavyBand from '@/components/backend/shell/NavyBand';
import SkeletonCard from '@/components/backend/kit/SkeletonCard';
import type { BoardData, BoardFilters } from '@/lib/leads/board-types';
import type { PipelineStage } from '@/lib/leads/pipeline-types';
import { buildWorkQueue, queueCounts, type QueueLane } from '@/lib/leads/work-queue';
import KpiStrip from './_components/kpi-strip';
import SourcesPanel from './_components/sources-panel';
import BoardFiltersBar from './_components/board-filters';
import LeadsBoard from './_components/leads-board';
import LeadDrawer from './_components/lead-drawer';
import LeadQueue from './_components/lead-queue';
import LeadQueueLauncher from './_components/lead-queue-launcher';
import { useLeadMutations } from './_components/use-lead-mutations';

const TEMPS = ['hot', 'warm', 'cold'] as const;

/**
 * Queue mutations must never trigger a board refetch: that GET re-reads 500
 * leads and runs sweepEnrollSubmitted (a write), so a 30-action sitting would
 * fire 30 of them. The queue reconciles once, on exit. Module-level so the
 * hook's useCallback identity stays stable across renders.
 */
const NO_REFETCH = async (): Promise<void> => {};

function filtersToQuery(f: BoardFilters): string {
  const params = new URLSearchParams();
  if (f.temp) params.set('temp', f.temp);
  if (f.occasion) params.set('occasion', f.occasion);
  if (f.source) params.set('source', f.source);
  if (f.channel) params.set('channel', f.channel);
  if (f.form) params.set('form', f.form);
  if (f.q) params.set('q', f.q);
  if (f.showSnoozed) params.set('showSnoozed', 'true');
  if (f.includePartial) params.set('includePartial', 'true');
  return params.toString();
}

function LeadsPageInner(): ReactElement {
  const search = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<BoardData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filters, setFilters] = useState<BoardFilters>(() => {
    const temp = search?.get('temp');
    return {
      // Validate — a garbage ?temp= must not wedge the board in a 400 loop.
      temp: TEMPS.includes(temp as (typeof TEMPS)[number])
        ? (temp as BoardFilters['temp'])
        : undefined,
    };
  });
  const [openLead, setOpenLead] = useState<string | null>(search?.get('lead') ?? null);
  // Out-of-order fetch guard: only the latest request may write state.
  const loadSeqRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const seq = ++loadSeqRef.current;
    try {
      const res = await fetch(`/api/v1/admin/leads/board?${filtersToQuery(filters)}`);
      if (seq !== loadSeqRef.current) return; // superseded by a newer request
      if (res.ok) {
        const body = await res.json();
        setData(body.data);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch {
      if (seq === loadSeqRef.current) setLoadFailed(true);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep links can also arrive via client-side nav while already mounted.
  useEffect(() => {
    const fromUrl = search?.get('lead') ?? null;
    if (fromUrl) setOpenLead(fromUrl);
  }, [search]);

  const mutations = useLeadMutations(load);
  const queueMutations = useLeadMutations(NO_REFETCH);

  const [lane, setLane] = useState<QueueLane>('direct');
  // Non-null while a queue is running; the value also keys the LeadQueue mount,
  // which is what freezes its snapshot for the duration of the sitting.
  const [queueRunAt, setQueueRunAt] = useState<number | null>(null);

  const counts = useMemo(
    () => (data ? queueCounts(data.columns) : { all: 0, premier: 0, direct: 0 }),
    [data],
  );
  const workQueue = useMemo(
    () => (data ? buildWorkQueue(data.columns, { lane, now: new Date() }) : []),
    [data, lane],
  );

  const exitQueue = useCallback((): void => {
    setQueueRunAt(null);
    void load(); // the one reconcile for the whole sitting
  }, [load]);

  const optimisticMove = useCallback((leadId: string, to: PipelineStage): void => {
    setData((prev) => {
      if (!prev) return prev;
      const columns = Object.fromEntries(
        Object.entries(prev.columns).map(([k, cards]) => [k, cards.filter((c) => c.id !== leadId)]),
      ) as BoardData['columns'];
      const card =
        Object.values(prev.columns).flat().find((c) => c.id === leadId) ??
        prev.tray.find((c) => c.id === leadId);
      if (card) columns[to] = [{ ...card, stage: to }, ...columns[to]];
      return { ...prev, columns, tray: prev.tray.filter((c) => c.id !== leadId) };
    });
  }, []);

  // On a failed move, re-sync from the server — a stored snapshot could
  // resurrect an older drag's state when two moves overlap (review #4).
  const rollback = useCallback((): void => {
    void load();
  }, [load]);

  const openDrawer = (id: string): void => {
    setOpenLead(id);
    const params = new URLSearchParams(window.location.search);
    params.set('lead', id);
    router.replace(`/admin/leads?${params.toString()}`, { scroll: false });
  };
  const closeDrawer = (): void => {
    setOpenLead(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('lead');
    router.replace(`/admin/leads${params.size ? `?${params}` : ''}`, { scroll: false });
    void load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <NavyBand>
        <div className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#B7C4D0]">
              Every inquiry, scored and tracked to Won or Lost.
            </p>
            <div className="flex items-center gap-2">
              <LeadQueueLauncher
                counts={counts}
                lane={lane}
                onLaneChange={setLane}
                onStart={() => setQueueRunAt(Date.now())}
              />
              <button
                type="button"
                onClick={() => void load()}
                className="min-h-[36px] px-3 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20"
              >
                Refresh
              </button>
            </div>
          </div>
          <BoardFiltersBar filters={filters} onChange={setFilters} />
        </div>
      </NavyBand>

      <div className="px-3 md:px-5 mt-4 space-y-4 max-w-[1800px] mx-auto">
        {data ? (
          <>
            <KpiStrip kpis={data.kpis} />
            <SourcesPanel
              activeForm={filters.form}
              onPickForm={(form) => setFilters({ ...filters, form })}
            />
            <LeadsBoard
              data={data}
              onOpen={openDrawer}
              mutations={mutations}
              optimisticMove={optimisticMove}
              rollback={rollback}
            />
          </>
        ) : loadFailed ? (
          <div className="card text-center py-10">
            <p className="text-gray-700">Couldn&apos;t load the board.</p>
            <button type="button" onClick={() => void load()} className="btn-primary mt-3">
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
      </div>

      {/* Only ever one live drawer: the queue owns it while a sitting runs, so
          the deep-link drawer stands down (two open sheets would fight over the
          body scroll lock and the Escape handler). */}
      <LeadDrawer
        leadId={queueRunAt === null ? openLead : null}
        onClose={closeDrawer}
        mutations={mutations}
      />

      {queueRunAt !== null && (
        <LeadQueue
          key={queueRunAt}
          queue={workQueue}
          mutations={queueMutations}
          onExit={exitQueue}
        />
      )}
    </div>
  );
}

export default function LeadsPage(): ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LeadsPageInner />
    </Suspense>
  );
}
