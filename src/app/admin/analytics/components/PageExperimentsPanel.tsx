'use client';

import { ReactElement, useState } from 'react';
import Link from 'next/link';
import CreateHeroTestModal from './CreateHeroTestModal';
import ExperimentResultCard, { type Experiment } from './ExperimentResultCard';
import { experimentPathsFor, type LandingPageDef } from '@/lib/analytics/landing-pages';

interface Props {
  def: LandingPageDef;
  /** Shared with ExperimentSummaryBanner via useExperiments — one fetch per tab. */
  experiments: Experiment[];
  loading: boolean;
  reload: () => Promise<void>;
}

/** A/B test management for one landing page: list, rich results, create, start/pause/conclude. */
export default function PageExperimentsPanel({ def, experiments, loading, reload }: Props): ReactElement {
  const [showCreate, setShowCreate] = useState(false);
  const [concludingId, setConcludingId] = useState<string | null>(null);
  const [winnerSel, setWinnerSel] = useState('');
  const [reason, setReason] = useState('');

  async function patch(id: string, body: Record<string, unknown>): Promise<void> {
    await fetch(`/api/admin/experiments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await reload();
  }
  async function del(id: string): Promise<void> {
    await fetch(`/api/admin/experiments/${id}`, { method: 'DELETE' });
    await reload();
  }

  function startConclude(exp: Experiment): void {
    setConcludingId(exp.id);
    setWinnerSel(exp.significance.winner?.id ?? exp.variants.find((v) => !v.isControl)?.id ?? '');
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
          This ad page can also run hero/CTA copy tests managed <strong>in code</strong> (Brian&apos;s system) —
          those results live in{' '}
          <Link href="/admin/brians-stuff" className="text-brand-blue underline">Brian&apos;s Stuff → Experiments &amp; Funnels</Link>.
          Tests you create here use the self-serve builder; while a Brian&apos;s hero test is running, self-serve
          hero tests on this page automatically stand down (no copy swap, no data recorded).
        </div>
      )}

      {isLegacyHeroPage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700">
          Homepage tests swap copy through the in-code variant registry (<strong>hero-variants.ts</strong>), not
          the copy fields below — leave them blank. Variant names must stay exactly{' '}
          <strong>Control / Variant A / Variant B / Variant C</strong> (renaming silently falls back to control
          copy for both sides). Self-serve copy-swap is live on every other landing page.
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
              canonicalPath={exp.page || def.canonicalPath}
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
          pathOptions={experimentPathsFor(def)}
          elementId={def.defaultExperimentElementId ?? 'hero'}
          pageLabel={def.displayName}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload(); }}
        />
      )}
    </div>
  );
}
