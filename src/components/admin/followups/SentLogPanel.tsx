'use client';

/**
 * Recent FOLLOW_UP sends with delivery-status chips (EmailLog, kept current
 * by the Resend webhook). Data: GET /api/ops/followups/log.
 */

import { useEffect, useState, type ReactElement } from 'react';

interface LogRow {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt: string | null;
  journeyKey: string | null;
  step: number | null;
  createdAt: string;
}

const STATUS_CHIP: Record<string, string> = {
  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  OPENED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  BOUNCED: 'bg-red-50 text-red-700 border-red-200',
  COMPLAINED: 'bg-red-50 text-red-700 border-red-200',
  FAILED: 'bg-amber-50 text-amber-800 border-amber-200',
  PENDING: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function SentLogPanel(): ReactElement {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ops/followups/log')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setLogs(json.logs as LogRow[]);
        else setError('Failed to load log');
      })
      .catch(() => setError('Failed to load log'));
  }, []);

  return (
    <div className="card" id="sent-log">
      <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-1">Sent Log</h2>
      <p className="text-sm text-gray-500 mb-4">Last 100 follow-up emails.</p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!logs ? (
        <p className="text-sm text-gray-500">Loading log…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">No follow-ups sent yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold">When</th>
                <th className="py-2 pr-4 font-semibold">Journey</th>
                <th className="py-2 pr-4 font-semibold">To</th>
                <th className="py-2 pr-4 font-semibold">Subject</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                    {new Date(log.sentAt ?? log.createdAt).toLocaleString('en-US', {
                      timeZone: 'America/Chicago',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 pr-4 text-gray-900">
                    {log.journeyKey ?? '—'}
                    {log.step ? ` · ${log.step}` : ''}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">{log.to}</td>
                  <td className="py-2 pr-4 text-gray-700 max-w-[280px] truncate">{log.subject}</td>
                  <td className="py-2">
                    <span
                      className={`inline-block text-xs border rounded px-1.5 py-0.5 ${
                        STATUS_CHIP[log.status] ?? STATUS_CHIP.PENDING
                      }`}
                    >
                      {log.status}
                    </span>
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
