'use client';

/**
 * Workbench filter/action bar: search + status filter + Sync + bulk Verify
 * + Enroll n/10 + Copy CSV. Vertical is fixed per page (hub segments).
 */

import Link from 'next/link';
import type { ReactElement } from 'react';
import type { PipelineStatus } from './types';

const STATUS_OPTIONS: Array<PipelineStatus | 'ALL'> = [
  'ALL',
  'SOURCED',
  'ENRICHED',
  'DRAFTED',
  'VERIFIED',
  'APPROVED',
  'ENROLLED',
  'SENT',
  'REPLIED',
  'SUPPRESSED',
];

export default function ProspectsFilterBar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  selectedCount,
  busy,
  onSync,
  onEnroll,
  onBulkVerify,
  onCopyCsv,
  csvCopied,
}: {
  search: string;
  onSearch: (q: string) => void;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
  selectedCount: number;
  busy: string | null;
  onSync: () => void;
  onEnroll: () => void;
  onBulkVerify: () => void;
  onCopyCsv: () => void;
  csvCopied: boolean;
}): ReactElement {
  return (
    <div className="space-y-2 mb-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search company, website, contact, email…"
          className="input-premium flex-1 min-w-[240px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          className="input-premium w-auto"
          aria-label="Filter by pipeline status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSync}
          disabled={busy !== null}
          className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === 'sync' ? 'Syncing…' : 'Sync to CRM'}
        </button>
        <button
          type="button"
          onClick={onEnroll}
          disabled={busy !== null || selectedCount === 0}
          className="btn-cart px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === 'enroll' ? 'Enrolling…' : `Enroll selected (${selectedCount}/10)`}
        </button>
        <button
          type="button"
          onClick={onBulkVerify}
          disabled={busy !== null}
          className="btn-secondary px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === 'verify-bulk' ? 'Verifying…' : 'Verify unverified emails'}
        </button>
        <button type="button" onClick={onCopyCsv} className="btn-ghost px-3 py-2.5">
          {csvCopied ? 'Copied ✓' : 'Copy CSV for Bulk Import'}
        </button>
        <Link href="/admin/affiliates/bulk-import" className="btn-ghost px-3 py-2.5">
          Open Bulk Import
        </Link>
        <span className="text-sm text-gray-500">
          Sends stay held until the partner-outreach flag is on.
        </span>
      </div>
    </div>
  );
}
