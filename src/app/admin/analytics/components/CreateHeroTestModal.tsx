'use client';

import { ReactElement, useState } from 'react';

interface VariantForm {
  name: string;
  weight: number;
  isControl: boolean;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subhead: string;
  ctaText: string;
}

interface CreateHeroTestModalProps {
  /** Canonical route the experiment is scoped to (e.g. '/weddings'). */
  canonicalPath: string;
  /** Routes on this tab that render their own hero — a selector shows when >1. */
  pathOptions?: string[];
  elementId: string;
  pageLabel: string;
  onClose: () => void;
  onCreated: () => void;
}

function blankVariant(name: string, isControl: boolean): VariantForm {
  return { name, weight: 50, isControl, eyebrow: '', headline: '', headlineAccent: '', subhead: '', ctaText: '' };
}

const FIELDS: { key: keyof Pick<VariantForm, 'eyebrow' | 'headline' | 'headlineAccent' | 'subhead' | 'ctaText'>; label: string }[] = [
  { key: 'eyebrow', label: 'Eyebrow' },
  { key: 'headline', label: 'Headline' },
  { key: 'headlineAccent', label: 'Headline 2nd line (Austin landers)' },
  { key: 'subhead', label: 'Subhead' },
  { key: 'ctaText', label: 'Button text' },
];

/**
 * Create a hero-copy A/B test for a landing page. Each variant carries optional
 * copy overrides; blank fields fall back to the page's default copy. Posts to
 * /api/admin/experiments with elementId='hero'.
 */
export default function CreateHeroTestModal({
  canonicalPath,
  pathOptions,
  elementId,
  pageLabel,
  onClose,
  onCreated,
}: CreateHeroTestModalProps): ReactElement {
  const [name, setName] = useState('');
  const [page, setPage] = useState(canonicalPath);
  const [goalMetric, setGoalMetric] = useState<'cta_click' | 'conversion'>('cta_click');
  const [variants, setVariants] = useState<VariantForm[]>([
    blankVariant('Control', true),
    blankVariant('Variant B', false),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = variants.reduce((s, v) => s + v.weight, 0);

  function update(i: number, patch: Partial<VariantForm>): void {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function addVariant(): void {
    if (variants.length >= 4) return;
    const letter = String.fromCharCode(65 + variants.length); // C, D
    setVariants((vs) => [...vs, blankVariant(`Variant ${letter}`, false)]);
  }
  function removeVariant(i: number): void {
    if (variants.length <= 2 || variants[i].isControl) return;
    setVariants((vs) => vs.filter((_, idx) => idx !== i));
  }

  async function submit(): Promise<void> {
    setError(null);
    if (!name.trim()) return setError('Give the test a name.');
    if (totalWeight !== 100) return setError(`Traffic split must total 100% (currently ${totalWeight}%).`);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          page,
          elementId,
          goalMetric,
          variants: variants.map((v) => ({
            name: v.name,
            isControl: v.isControl,
            weight: v.weight,
            content: {
              ...(v.eyebrow.trim() && { eyebrow: v.eyebrow.trim() }),
              ...(v.headline.trim() && { headline: v.headline.trim() }),
              ...(v.headlineAccent.trim() && { headlineAccent: v.headlineAccent.trim() }),
              ...(v.subhead.trim() && { subhead: v.subhead.trim() }),
              ...(v.ctaText.trim() && { ctaText: v.ctaText.trim() }),
            },
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create test');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-heading tracking-[0.08em] text-gray-900">New hero test — {pageLabel}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <label className="block text-base font-medium text-gray-700 mb-1">Test name</label>
        <input className="input-premium mb-4" value={name} placeholder="e.g. Wedding hero — benefit vs urgency"
          onChange={(e) => setName(e.target.value)} />

        {pathOptions && pathOptions.length > 1 && (
          <>
            <label className="block text-base font-medium text-gray-700 mb-1">Which page&apos;s hero?</label>
            <select className="input-premium mb-4" value={page} onChange={(e) => setPage(e.target.value)}>
              {pathOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </>
        )}

        <label className="block text-base font-medium text-gray-700 mb-1">Goal</label>
        <select className="input-premium mb-4" value={goalMetric} onChange={(e) => setGoalMetric(e.target.value as 'cta_click' | 'conversion')}>
          <option value="cta_click">Hero CTA clicks (recommended)</option>
          <option value="conversion">Purchases</option>
        </select>

        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-medium text-gray-700">Variants</span>
          <span className={`text-sm ${totalWeight === 100 ? 'text-gray-500' : 'text-red-600'}`}>Split: {totalWeight}%</span>
        </div>

        <div className="space-y-4">
          {variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <input className="input-premium flex-1" value={v.name} onChange={(e) => update(i, { name: e.target.value })} />
                {v.isControl && <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">Control</span>}
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input type="number" min={0} max={100} value={v.weight} className="input-premium w-20"
                    onChange={(e) => update(i, { weight: Number(e.target.value) })} />%
                </label>
                {!v.isControl && variants.length > 2 && (
                  <button type="button" onClick={() => removeVariant(i)} className="text-gray-400 hover:text-red-600 text-sm">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FIELDS.map((f) => (
                  <input key={f.key} className="input-premium" placeholder={v.isControl ? `${f.label} (blank = current copy)` : f.label}
                    value={v[f.key]} onChange={(e) => update(i, { [f.key]: e.target.value } as Partial<VariantForm>)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {variants.length < 4 && (
          <button type="button" onClick={addVariant} className="btn-ghost mt-2">+ Add variant</button>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Creating…' : 'Create test (draft)'}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Created as a draft. Press Start in the panel to launch it — visitors then see the assigned variant&apos;s copy.
        </p>
      </div>
    </div>
  );
}
