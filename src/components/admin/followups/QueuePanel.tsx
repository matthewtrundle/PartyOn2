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
      <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-1">Upcoming Queue</h2>
      <p className="text-sm text-gray-500 mb-4">
        Next 50 scheduled sends. The engine re-checks every cancel condition before sending.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!jobs ? (
        <p className="text-sm text-gray-500">Loading queue…</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing queued.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">Journey</th>
                <th className="py-2 pr-4 font-semibold">Step</th>
                <th className="py-2 pr-4 font-semibold">To</th>
                <th className="py-2 pr-4 font-semibold">Sends at</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-900">{job.journeyKey}</td>
                  <td className="py-2 pr-4 text-gray-700">{job.step}</td>
                  <td className="py-2 pr-4 text-gray-700">{job.email}</td>
                  <td className="py-2 pr-4 text-gray-700">
                    {new Date(job.scheduledFor).toLocaleString('en-US', {
                      timeZone: 'America/Chicago',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">{job.status}</td>
                  <td className="py-2 text-right">
                    {job.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => void cancel(job.id)}
                        disabled={busyId === job.id}
                        className="btn-ghost text-red-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
