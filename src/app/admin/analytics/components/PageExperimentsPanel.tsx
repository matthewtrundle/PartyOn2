'use client';

import { ReactElement, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CreateHeroTestModal from './CreateHeroTestModal';
import type { LandingPageDef } from '@/lib/analytics/landing-pages';

interface HeroContent {
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  ctaText?: string;
}
interface VariantRow {
  id: string;
  name: string;
  isControl: boolean;
  weight: number;
  impressions: number;
  clicks: number;
  conversions: number;
  clickRate: number;
  conversionRate: number;
  content: HeroContent | null;
}
interface SigVariant { id: string; confidence: number; liftPct: number; pValue: number }
interface Significance { variants: SigVariant[]; winner: string | null; hasEnoughData: boolean }
interface Experiment {
  id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  goalMetric: string;
  winningVariant: string | null;
  winnerReason: string | null;
  daysRunning: number;
  significance: Significance;
  variants: VariantRow[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  RUNNING: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

/** A/B test management for one landing page: list, results, create, start/pause/conclude. */
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
  // Hero copy-swap is wired on weddings/boat-parties/corporate/cocktail-kits.
  // Home uses the existing HeroSection variant system; campaign pages use Brian's.
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
        <div className="h-24 bg-gray-100 rounded animate-pulse" />
      ) : experiments.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          No A/B tests yet for this page. Click “New hero test” to try two headlines and see which converts.
        </p>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <div key={exp.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900">{exp.name}</div>
                  <div className="text-xs text-gray-500">
                    goal: {exp.goalMetric}{exp.status === 'RUNNING' ? ` · day ${exp.daysRunning}` : ''}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[exp.status]}`}>{exp.status}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-1 pr-2 font-medium">Variant</th>
                      <th className="py-1 pr-2 font-medium">Headline</th>
                      <th className="py-1 pr-2 font-medium text-right">Views</th>
                      <th className="py-1 pr-2 font-medium text-right">Clicks</th>
                      <th className="py-1 pr-2 font-medium text-right">Rate</th>
                      <th className="py-1 font-medium text-right">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exp.variants.map((v) => {
                      const sig = exp.significance.variants.find((s) => s.id === v.id);
                      const isWinner = exp.significance.winner === v.id || exp.winningVariant === v.id;
                      return (
                        <tr key={v.id} className="border-b border-gray-50">
                          <td className="py-1 pr-2 text-gray-900">
                            {v.name}{v.isControl && <span className="text-gray-400"> (control)</span>}
                            {isWinner && <span className="ml-1 text-amber-600 font-semibold">★ winner</span>}
                          </td>
                          <td className="py-1 pr-2 text-gray-600 max-w-[14rem] truncate">{v.content?.headline ?? '—'}</td>
                          <td className="py-1 pr-2 text-right">{v.impressions.toLocaleString()}</td>
                          <td className="py-1 pr-2 text-right">{v.clicks.toLocaleString()}</td>
                          <td className="py-1 pr-2 text-right">{v.clickRate.toFixed(1)}%</td>
                          <td className="py-1 text-right text-gray-600">{sig && !v.isControl ? `${Math.round(sig.confidence)}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {exp.status === 'COMPLETED' && exp.winnerReason && (
                <p className="mt-2 text-sm text-gray-600"><span className="font-medium">Why it won:</span> {exp.winnerReason}</p>
              )}

              {concludingId === exp.id ? (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2">
                  <select className="input-premium" value={winnerSel} onChange={(e) => setWinnerSel(e.target.value)}>
                    {exp.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <input className="input-premium" placeholder="Why did it win? (one line — logged to Obsidian)"
                    value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary text-sm" onClick={() => saveConclude(exp)}>Save winner &amp; log</button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setConcludingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {exp.status === 'DRAFT' && <button type="button" className="btn-primary text-sm" onClick={() => patch(exp.id, { status: 'RUNNING' })}>Start</button>}
                  {exp.status === 'RUNNING' && <button type="button" className="btn-secondary text-sm" onClick={() => patch(exp.id, { status: 'PAUSED' })}>Pause</button>}
                  {exp.status === 'PAUSED' && <button type="button" className="btn-primary text-sm" onClick={() => patch(exp.id, { status: 'RUNNING' })}>Resume</button>}
                  {(exp.status === 'RUNNING' || exp.status === 'PAUSED') && <button type="button" className="btn-secondary text-sm" onClick={() => startConclude(exp)}>Conclude</button>}
                  {exp.status !== 'RUNNING' && exp.status !== 'COMPLETED' && <button type="button" className="btn-ghost text-sm text-red-600" onClick={() => del(exp.id)}>Delete</button>}
                </div>
              )}
            </div>
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
