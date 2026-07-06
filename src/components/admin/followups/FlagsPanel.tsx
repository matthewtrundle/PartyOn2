'use client';

/**
 * Master kill switch + per-journey flag toggles with queue counts.
 * Data: GET/POST /api/ops/followups/flags.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';

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

function Toggle({
  enabled,
  busy,
  onChange,
}: {
  enabled: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}): ReactElement {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-brand-blue' : 'bg-gray-300'
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
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
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900">Master Switch</h2>
          <p className="text-sm text-gray-500">
            Nothing sends while this is off, regardless of journey flags.
          </p>
        </div>
        <Toggle
          enabled={data.master.enabled}
          busy={busyKey === data.master.key}
          onChange={(next) => void toggle(data.master.key, next)}
        />
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="divide-y divide-gray-100">
        {data.journeys.map((j) => (
          <div key={j.key} className="py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{j.label}</span>
                <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                  phase {j.phase} · {j.steps} touch{j.steps > 1 ? 'es' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{j.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                queued {j.counts.scheduled} · sent {j.counts.sent} · canceled {j.counts.canceled} ·
                suppressed {j.counts.suppressed} · failed {j.counts.failed}
              </p>
            </div>
            <Toggle
              enabled={j.enabled}
              busy={busyKey === j.featureFlag}
              onChange={(next) => void toggle(j.featureFlag, next)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
