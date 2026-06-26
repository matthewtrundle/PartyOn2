/**
 * Game Plan — the back-end living-document + to-do tracker for Allan & Brian.
 * Initiatives grouped under strategic pillars, each with status, owner,
 * priority, a sub-task checklist, an append-only progress log, and linked
 * director recommendations. Admin-gated by the /admin layout.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, ReactElement } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useStrategyUser, NamePrompt, NameSwitcher } from './_components/name-picker';
import { useStrategyMutations } from './_components/use-strategy-mutations';
import InitiativeCard from './_components/initiative-card';
import NewInitiativeModal from './_components/new-initiative-modal';
import {
  PILLARS,
  PILLAR_META,
  type StrategyInitiativeDTO,
  type LinkedRecsSummary,
  type CreateInitiativeInput,
} from '@/lib/strategy/types';

const EMPTY_RECS: LinkedRecsSummary = {
  counts: { finance: 0, operations: 0, marketing: 0, seo: 0 },
  titles: { finance: [], operations: [], marketing: [], seo: [] },
};

export default function StrategyPage(): ReactElement {
  const { user, ready, setUser } = useStrategyUser();
  const [initiatives, setInitiatives] = useState<StrategyInitiativeDTO[]>([]);
  const [recs, setRecs] = useState<LinkedRecsSummary>(EMPTY_RECS);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StrategyInitiativeDTO | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/admin/strategy');
      if (res.ok) {
        const data = await res.json();
        setInitiatives(data.initiatives ?? []);
        setRecs(data.recs ?? EMPTY_RECS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const mutations = useStrategyMutations(fetchData);

  const stats = useMemo(() => {
    const total = initiatives.length;
    const done = initiatives.filter((i) => i.status === 'done').length;
    const inProgress = initiatives.filter((i) => i.status === 'in_progress').length;
    const blocked = initiatives.filter((i) => i.status === 'blocked').length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, inProgress, blocked, pct };
  }, [initiatives]);

  const openCreate = (): void => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (initiative: StrategyInitiativeDTO): void => {
    setEditing(initiative);
    setModalOpen(true);
  };
  const handleSubmit = async (values: CreateInitiativeInput): Promise<boolean> =>
    editing ? mutations.patch(editing.id, values) : mutations.create(values);

  if (!ready || loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-9 w-48 bg-gray-200 rounded mb-6" />
          <div className="h-16 bg-gray-200 rounded-xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <NamePrompt onPick={setUser} />;
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading tracking-[0.1em] text-gray-900">Game Plan</h1>
          <p className="text-sm text-gray-600 mt-1">
            Our living plan to grow the bottom line — and where each piece stands.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NameSwitcher user={user} onPick={setUser} />
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-1.5">
            <PlusIcon className="h-5 w-5" /> New
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="card !p-4 mb-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.pct}%</div>
            <div className="text-sm text-gray-500">complete</div>
          </div>
          <div className="flex gap-6 text-sm">
            <div><span className="font-bold text-gray-900">{stats.done}</span> <span className="text-gray-500">done</span></div>
            <div><span className="font-bold text-blue-700">{stats.inProgress}</span> <span className="text-gray-500">in progress</span></div>
            <div><span className="font-bold text-red-600">{stats.blocked}</span> <span className="text-gray-500">blocked</span></div>
            <div><span className="font-bold text-gray-900">{stats.total}</span> <span className="text-gray-500">total</span></div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Pillars */}
      <div className="space-y-10">
        {PILLARS.map((pillar) => {
          const items = initiatives.filter((i) => i.pillar === pillar);
          return (
            <section key={pillar}>
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="text-2xl font-heading tracking-[0.1em] text-gray-900">
                  {PILLAR_META[pillar].label}
                </h2>
                <span className="text-sm text-gray-400">{items.length}</span>
              </div>
              <p className="text-sm text-gray-500 -mt-2 mb-4">{PILLAR_META[pillar].blurb}</p>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nothing here yet.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {items.map((initiative) => (
                    <InitiativeCard
                      key={initiative.id}
                      initiative={initiative}
                      recs={recs}
                      currentUser={user}
                      saving={mutations.savingId === initiative.id}
                      onPatch={mutations.patch}
                      onRemove={mutations.remove}
                      onAddNote={mutations.addNote}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      </div>

      <NewInitiativeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        saving={mutations.creating || (editing ? mutations.savingId === editing.id : false)}
        initial={editing}
        defaultOwner={user}
      />
    </div>
  );
}
