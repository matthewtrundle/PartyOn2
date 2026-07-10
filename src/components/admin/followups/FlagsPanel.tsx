'use client';

/**
 * Master kill switch + per-journey flag toggles with queue counts.
 * Data: GET/POST /api/ops/followups/flags. The master card is the navy
 * kill switch from the HQ design — nothing sends while it's off,
 * regardless of journey flags, and flipping it pauses the queue instantly.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import Toggle from '@/components/backend/kit/Toggle';

interface JourneyCounts {
  scheduled: number;
  sent: number;
  canceled: number;
  suppressed: number;
  failed: number;
}

interface JourneyFlag {
  key: string;
  label: string;
  description: string;
  phase: number;
  steps: number;
  featureFlag: string;
  enabled: boolean;
  counts: JourneyCounts;
}

interface FlagsResponse {
  success: boolean;
  master: { key: string; enabled: boolean };
  journeys: JourneyFlag[];
}

export default function FlagsPanel(): ReactElement {
  const [data, setData] = useState<FlagsResponse | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/followups/flags');
      const json = (await res.json()) as FlagsResponse;
      if (json.success) setData(json);
      else setError('Failed to load flags');
    } catch {
      setError('Failed to load flags');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: string, enabled: boolean): Promise<void> => {
    setBusyKey(key);
    setError('');
    try {
      const res = await fetch('/api/ops/followups/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) setError('Toggle failed');
      await load();
    } catch {
      setError('Toggle failed');
    } finally {
      setBusyKey(null);
    }
  };

  if (!data) {
    return <div className="card text-sm text-gray-500">Loading flags…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Master kill switch — navy card */}
      <div className="bg-navy rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-lg tracking-[0.08em] uppercase text-white">
            Automation
          </h2>
          <p className="text-sm text-[#8FA3B5]">
            Master switch — pauses the queue instantly. Nothing sends while off, regardless of flow flags.
          </p>
        </div>
        <Toggle
          size="master"
          checked={data.master.enabled}
          disabled={busyKey === data.master.key}
          label="Follow-up automation master switch"
          onChange={(next) => void toggle(data.master.key, next)}
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {/* Per-flow rows */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {data.journeys.map((j) => (
          <div
            key={j.key}
            className={`px-4 py-3 min-h-[64px] flex items-center justify-between gap-4 ${
              j.enabled ? '' : 'opacity-60'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{j.label}</span>
                <span className="inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase bg-gray-100 text-gray-500">
                  phase {j.phase} · {j.steps} touch{j.steps > 1 ? 'es' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{j.description}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                queued {j.counts.scheduled} · sent {j.counts.sent} · canceled {j.counts.canceled} ·
                suppressed {j.counts.suppressed} · failed {j.counts.failed}
              </p>
            </div>
            <Toggle
              size="row"
              checked={j.enabled}
              disabled={busyKey === j.featureFlag}
              label={`${j.label} flow`}
              onChange={(next) => void toggle(j.featureFlag, next)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
