'use client';

import { ReactElement } from 'react';
import HqBadge from '@/components/backend/kit/Badge';
import { temperatureFor } from '@/lib/leads/scoring';
import type { LeadDetail } from './drawer-types';

const TEMP_VARIANT = { hot: 'red', warm: 'amber', cold: 'gray' } as const;

/** Drawer header: name, contact links, GHL escape hatch, temperature badge. */
export default function DrawerHeader({
  lead,
  name,
}: {
  lead: LeadDetail['lead'];
  name: string;
}): ReactElement {
  const temp = temperatureFor(lead.leadScore);
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-heading font-bold text-2xl tracking-[0.05em] text-gray-900">
          {name}
        </h2>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="text-brand-blue underline">
              {lead.email}
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-brand-blue underline">
              {lead.phone}
            </a>
          )}
          <a
            href="https://app.gohighlevel.com"
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 underline"
            title="SMS lives in GHL until the CRM cutover"
          >
            Open GHL
          </a>
        </div>
      </div>
      {temp && (
        <HqBadge variant={TEMP_VARIANT[temp]}>
          {temp} {lead.leadScore}
        </HqBadge>
      )}
    </header>
  );
}
