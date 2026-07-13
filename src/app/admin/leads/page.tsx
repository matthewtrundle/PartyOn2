'use client';

/**
 * Lead Flow — the Kanban lead pipeline (/admin/leads).
 *
 * Every submitted lead lands here as a card: New → Contacted → Qualified →
 * Quote Sent → Won → Lost, scored cold/warm/hot. Deep-linkable via
 * ?lead=<id> (the URL GHL notifications carry). Data refreshes on demand and
 * after every mutation; refresh is suspended while a drag is in flight.
 */

import { ReactElement, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavyBand from '@/components/backend/shell/NavyBand';
import SkeletonCard from '@/components/backend/kit/SkeletonCard';
import type { BoardData, BoardFilters } from '@/lib/leads/board-types';
import type { PipelineStage } from '@/lib/leads/pipeline-types';
import KpiStrip from './_components/kpi-strip';
import BoardFiltersBar from './_components/board-filters';
import LeadsBoard from './_components/leads-board';
import LeadDrawer from './_components/lead-drawer';
import { useLeadMutations } from './_components/use-lead-mutations';

function filtersToQuery(f: BoardFilters): string {
  const params = new URLSearchParams();
  if (f.temp) params.set('temp', f.temp);
  if (f.occasion) params.set('occasion', f.occasion);
  if (f.source) params.set('source', f.source);
  if (f.q) params.set('q', f.q);
  if (f.showSnoozed) params.set('showSnoozed', 'true');
  if (f.includePartial) params.set('includePartial', 'true');
  return params.toString();
}

function LeadsPageInner(): ReactElement {
  const search = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<BoardData | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(() => ({
    temp: (search?.get('temp') as BoardFilters['temp']) ?? undefined,
  }));
  const [openLead, setOpenLead] = useState<string | null>(search?.get('lead') ?? null);
  const snapshotRef = useRef<BoardData | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/v1/admin/leads/board?${filtersToQuery(filters)}`);
    if (res.ok) {
      const body = await res.json();
      setData(body.data);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutations = useLeadMutations(load);

  const optimisticMove = useCallback((leadId: string, to: PipelineStage): void => {
    setData((prev) => {
      if (!prev) return prev;
      snapshotRef.current = prev;
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

  const rollback = useCallback((): void => {
    if (snapshotRef.current) setData(snapshotRef.current);
  }, []);

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
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-[36px] px-3 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20"
            >
              Refresh
            </button>
          </div>
          <BoardFiltersBar filters={filters} onChange={setFilters} />
        </div>
      </NavyBand>

      <div className="px-3 md:px-5 mt-4 space-y-4 max-w-[1800px] mx-auto">
        {data ? (
          <>
            <KpiStrip kpis={data.kpis} />
            <LeadsBoard
              data={data}
              onOpen={openDrawer}
              mutations={mutations}
              optimisticMove={optimisticMove}
              rollback={rollback}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
      </div>

      <LeadDrawer leadId={openLead} onClose={closeDrawer} mutations={mutations} />
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
