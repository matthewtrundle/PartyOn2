'use client';

/**
 * Next 50 scheduled follow-up jobs (masked emails) with per-job cancel.
 * Data: GET/POST /api/ops/followups/queue.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';

interface QueueJob {
  id: string;
  journeyKey: string;
  step: number;
  email: string;
  status: string;
  scheduledFor: string;
  attempts: number;
  createdAt: string;
}

export default function QueuePanel(): ReactElement {
  const [jobs, setJobs] = useState<QueueJob[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/followups/queue');
      const json = await res.json();
      if (json.success) setJobs(json.jobs as QueueJob[]);
      else setError('Failed to load queue');
    } catch {
      setError('Failed to load queue');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (jobId: string): Promise<void> => {
    setBusyId(jobId);
    setError('');
    try {
      const res = await fetch('/api/ops/followups/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) setError('Cancel failed');
      await load();
    } catch {
      setError('Cancel failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900">Next in Queue</h2>
        <a href="#sent-log" className="text-sm font-semibold text-brand-blue hover:underline">
          Sent log ↓
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Next 50 scheduled sends. The engine re-checks every cancel condition before sending.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!jobs ? (
        <p className="text-sm text-gray-500">Loading queue…</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing queued.</p>
      ) : (
        <div className="divide-y divide-gray-100 -mx-2">
          {jobs.map((job) => (
            <div key={job.id} className="px-2 py-2.5 min-h-[52px] flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-semibold text-gray-900">
                  {job.email}
                  <span className="ml-2 text-gray-400 font-normal">step {job.step}</span>
                </p>
                <p className="text-sm text-gray-500">{job.journeyKey}</p>
              </div>
              <div className="text-sm font-semibold text-gray-700 tabular-nums whitespace-nowrap">
                {new Date(job.scheduledFor).toLocaleString('en-US', {
                  timeZone: 'America/Chicago',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
              <span className="inline-flex items-center px-2 py-[3px] rounded text-xs font-bold tracking-[0.05em] uppercase bg-blue-100 text-blue-800">
                {job.status}
              </span>
              {job.status === 'scheduled' && (
                <button
                  type="button"
                  onClick={() => void cancel(job.id)}
                  disabled={busyId === job.id}
                  className="min-h-[36px] px-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 touch-manipulation"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
