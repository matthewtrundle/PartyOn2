'use client';

/**
 * Pipeline status chip (derived — no stored mega-status) + FAILED overlay
 * dot. Precedence lives in deriveStatus() (types.ts).
 */

import type { ReactElement } from 'react';
import { deriveStatus, hasFailure, type LeadState, type ProspectRow } from './types';

const CHIP: Record<string, { label: string; cls: string }> = {
  SUPPRESSED: { label: 'Suppressed', cls: 'bg-red-100 text-red-800' },
  REPLIED: { label: 'Replied', cls: 'bg-purple-100 text-purple-800' },
  SENT: { label: 'Sent', cls: 'bg-green-100 text-green-800' },
  ENROLLED: { label: 'Enrolled', cls: 'bg-blue-100 text-blue-800' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
  VERIFIED: { label: 'Verified', cls: 'bg-teal-100 text-teal-800' },
  DRAFTED: { label: 'Drafted', cls: 'bg-amber-100 text-amber-800' },
  ENRICHED: { label: 'Enriched', cls: 'bg-sky-100 text-sky-800' },
  SOURCED: { label: 'Sourced', cls: 'bg-gray-100 text-gray-600' },
};

export default function ProspectStatusChip({
  prospect,
  state,
}: {
  prospect: ProspectRow;
  state?: LeadState;
}): ReactElement {
  const status = deriveStatus(prospect, state);
  const chip = CHIP[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded ${chip.cls}`}>
      {chip.label}
      {hasFailure(prospect) && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-red-500"
          title={
            prospect.researchStatus === 'FAILED'
              ? 'Research failed — see drawer'
              : 'Draft generation failed — see drawer'
          }
        />
      )}
    </span>
  );
}
