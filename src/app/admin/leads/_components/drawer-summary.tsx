'use client';

import { ReactElement } from 'react';
import HqBadge from '@/components/backend/kit/Badge';
import type { LeadDetail } from './drawer-types';
import { deriveActivitySummary } from './drawer-derive';

/**
 * At-a-glance activity strip below the header: a few chips ("Quote sent",
 * "Emailed 2d ago", "Opened email", "Submitted a form", "3 site visits") so an
 * operator sees where the lead stands without reading the full timeline. It's a
 * summary of the same events — renders nothing when there's no activity yet.
 */
export default function DrawerSummary({ detail }: { detail: LeadDetail }): ReactElement | null {
  const chips = deriveActivitySummary(detail, new Date());
  if (chips.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <HqBadge key={c.key} variant={c.variant}>
          {c.label}
        </HqBadge>
      ))}
    </div>
  );
}
