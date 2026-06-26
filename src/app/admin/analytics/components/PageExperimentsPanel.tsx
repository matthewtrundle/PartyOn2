'use client';

import { ReactElement, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CreateHeroTestModal from './CreateHeroTestModal';
import ExperimentResultCard, { type Experiment } from './ExperimentResultCard';
import type { LandingPageDef } from '@/lib/analytics/landing-pages';

/** A/B test management for one landing page: list, rich results, create, start/pause/conclude. */
export default function PageExperimentsPanel({ def }: { def: LandingPageDef }): ReactElement {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [concludingId, setConcludingId] = useState<string | null>(null);
  const [winnerSel, setWinnerSel] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/experiments?page=${encodeURIComponent(def.canonicalPath)}`, { cache: 'no-store' });
      const json = await res.json();
      setExperiments(res.ok ? (json.experiments ?? []) : []);
    } catch {
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, [def.canonicalPath]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>): Promise<void> {
    await fetch(`/api/admin/experiments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
  }
  async function del(id: string): Promise<void> {
    await fetch(`/api/admin/experiments/${id}`, { method: 'DELETE' });
    await load();
  }

  function startConclude(exp: Experiment): void {
    setConcludingId(exp.id);
    setWinnerSel(exp.significance.winner ?? exp.variants.find((v) => !v.isControl)?.id ?? '');
    setReason('');
  }
  async function saveConclude(exp: Experiment): Promise<void> {
    const conf = exp.significance.variants.find((v) => v.id === winnerSel)?.confidence;
    await patch(exp.id, {
      status: 'COMPLETED',
      winningVariant: winnerSel,
      winnerReason: reason.trim() || undefined,
      ...(conf != null && { confidence: Math.round(conf) }),
    });
    setConcludingId(null);
  }

  const isCampaignPage = def.key === 'bachelor' || def.key === 'bachelorette';
  const isLegacyHeroPage = def.key === 'home';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">A/B tests</h3>
        <button type="button" className="btn-primary text-sm" onClick={() => setShowCreate(true)}>+ New hero test</button>
      </div>

      {isCampaignPage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700">
          This ad page also runs hero/CTA copy tests managed <strong>in code</strong> (Brian&apos;s system).
          Those results live in{' '}
          <Link href="/admin/brians-stuff" className="text-brand-blue underline">Brian&apos;s Stuff → Experiments &amp; Funnels</Link>.
          New tests you create here use the self-serve builder and won&apos;t touch that system.
        </div>
      )}

      {isLegacyHeroPage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700">
          The homepage hero is rendered by the existing <strong>HeroSection</strong> variant system, so a new
          test here is tracked but won&apos;t swap the homepage copy until that&apos;s migrated to the
          self-serve builder. Hero copy-swap is live on Weddings, Boat Parties, Corporate &amp; Cocktail Kits.
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      ) : experiments.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          No A/B tests yet for this page. Click “New hero test” to try two headlines and see which converts.
        </p>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <ExperimentResultCard
              key={exp.id}
              exp={exp}
              canonicalPath={def.canonicalPath}
              onStatus={(status) => patch(exp.id, { status })}
              onDelete={() => del(exp.id)}
              conclude={{
                active: concludingId === exp.id,
                winnerSel,
                reason,
                setWinner: setWinnerSel,
                setReason,
                start: () => startConclude(exp),
                cancel: () => setConcludingId(null),
                save: () => saveConclude(exp),
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateHeroTestModal
          canonicalPath={def.canonicalPath}
          elementId={def.defaultExperimentElementId}
          pageLabel={def.displayName}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
