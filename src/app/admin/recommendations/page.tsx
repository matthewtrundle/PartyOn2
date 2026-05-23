'use client';

/**
 * Unified recommendation triage queue — Marketing, SEO, and Operations.
 *
 * Replaces /admin/analytics/recommendations. The old path now redirects here.
 * See docs/OPERATIONS-DIRECTOR-AGENT-BUILDOUT.md §7 Phase 1C and §11 #1.
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RecommendationCard } from '@/components/admin/RecommendationCard';
import type { RecommendationCardData } from '@/lib/recommendations/card-types';
import { DomainChips, type DomainChip } from './_components/domain-chips';
import { DismissModal } from './_components/dismiss-modal';
import { SnoozeMenu } from './_components/snooze-menu';
import { useQueueMutations } from './_components/use-queue-mutations';

type QueueResponse = {
  data: RecommendationCardData[];
  counts: Record<'marketing' | 'seo' | 'operations', number>;
  detectorRanAt: Record<'marketing' | 'seo' | 'operations', string | null>;
};

const PAGE_SIZE = 50;

const CHIPS: DomainChip[] = [
  { value: 'all', label: 'All' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'seo', label: 'SEO' },
];

export default function UnifiedRecommendationsPage(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const domain = (searchParams?.get('domain') as DomainChip['value']) ?? 'all';

  const [response, setResponse] = useState<QueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (domain !== 'all') params.set('domain', domain);
      params.set('status', 'open,approved');
      params.set('limit', '500');
      const res = await fetch(`/api/admin/recommendations?${params.toString()}`);
      if (res.ok) setResponse(await res.json());
    } catch (err) {
      console.error('Failed to load recommendations', err);
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  const mut = useQueueMutations({
    onChanged: fetchList,
    onNavigate: (href: string) => router.push(href),
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    fetchList();
  }, [fetchList]);

  const setDomain = (value: DomainChip['value']) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value === 'all') params.delete('domain');
    else params.set('domain', value);
    router.replace(`/admin/recommendations?${params.toString()}`);
  };

  const visibleRecs = useMemo(() => (response?.data ?? []).slice(0, visibleCount), [response, visibleCount]);
  const totalCount = response?.data.length ?? 0;
  const hasMore = totalCount > visibleCount;
  const visibleChips = useMemo(() => {
    if (!response) return CHIPS;
    return CHIPS.filter((c) => c.value === 'all' || (response.counts[c.value] ?? 0) > 0);
  }, [response]);
  const detectorTs = response?.detectorRanAt[domain === 'all' ? 'operations' : domain] ?? null;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/dashboard" className="text-blue-600 text-sm hover:underline">← Admin</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Recommendations</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-heading tracking-[0.05em]">
              Recommendation queue
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Marketing, SEO, and Operations directors propose actions here. Sort by severity, then newest.
            </p>
          </div>
          <button
            onClick={fetchList}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm shadow-sm min-h-[44px]"
          >
            Refresh
          </button>
        </div>

        <DomainChips chips={visibleChips} current={domain} counts={response?.counts} onChange={setDomain} />

        {isLoading && !response ? (
          <SkeletonList />
        ) : visibleRecs.length === 0 ? (
          <EmptyState domain={domain} detectorTs={detectorTs} />
        ) : (
          <div className="space-y-3">
            {visibleRecs.map((rec) => (
              <div key={rec.id} className="relative">
                <RecommendationCard
                  rec={rec}
                  showDomainBadge={domain === 'all'}
                  isSaving={mut.savingId === rec.id}
                  isExpanded={expanded.has(rec.id)}
                  isEditingNotes={editingNotes === rec.id}
                  notesValue={notesValue}
                  onToggleExpand={(id) => setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  })}
                  onRequestTransition={mut.transition}
                  onStartEditNotes={(id, initial) => { setEditingNotes(id); setNotesValue(initial); }}
                  onNotesChange={setNotesValue}
                  onSaveNotes={(id) => {
                    void mut.saveNotes(id, rec.status, notesValue);
                    setEditingNotes(null);
                    setNotesValue('');
                  }}
                  onCancelEditNotes={() => { setEditingNotes(null); setNotesValue(''); }}
                  onExecuteAction={mut.executeAction}
                />
                {(rec.status === 'open' || rec.status === 'approved') && (
                  <div className="flex justify-end gap-2 px-5 -mt-2 pb-3">
                    <SnoozeMenu isSaving={mut.savingId === rec.id} onSnooze={(days) => mut.snooze(rec, days)} />
                  </div>
                )}
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm shadow-sm min-h-[44px]"
                >
                  Load more ({totalCount - visibleCount} remaining)
                </button>
              </div>
            )}
            <div className="text-xs text-gray-400 pt-2 text-center">
              {visibleRecs.length} of {totalCount} shown
              {detectorTs && ` · Detectors last ran ${new Date(detectorTs).toLocaleString()}`}
            </div>
          </div>
        )}
      </div>

      {mut.dismissTarget && (
        <DismissModal
          rec={mut.dismissTarget}
          isSaving={mut.savingId === mut.dismissTarget.id}
          onCancel={() => mut.setDismissTarget(null)}
          onSubmit={mut.dismiss}
        />
      )}
    </div>
  );
}

function SkeletonList(): ReactElement {
  return (
    <div className="space-y-3" aria-label="Loading recommendations">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm animate-pulse">
          <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
          <div className="h-3 w-1/2 bg-gray-100 rounded mb-2" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ domain, detectorTs }: { domain: string; detectorTs: string | null }): ReactElement {
  const label = domain === 'all' ? '' : domain;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No active {label} recommendations.</p>
      {detectorTs && (
        <p className="text-gray-400 text-xs mt-2">
          Detectors last ran {new Date(detectorTs).toLocaleString()}
        </p>
      )}
    </div>
  );
}
