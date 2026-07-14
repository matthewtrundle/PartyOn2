'use client';

import { ReactElement } from 'react';
import KPITile from '@/components/backend/kit/KPITile';
import type { BoardKpis } from '@/lib/leads/board-types';

/** Top-line board stats. */
export default function KpiStrip({ kpis }: { kpis: BoardKpis }): ReactElement {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KPITile label="New this week" value={String(kpis.newThisWeek)} />
      <KPITile
        label="Hot leads"
        value={String(kpis.hot)}
        valueTone={kpis.hot > 0 ? 'red' : 'default'}
      />
      <KPITile
        label="Needs response"
        value={String(kpis.needsResponse)}
        delta={kpis.needsResponse > 0 ? 'reply from the card' : 'all caught up'}
        deltaTone={kpis.needsResponse > 0 ? 'red' : 'green'}
      />
      <KPITile
        label="Won · 30d"
        value={String(kpis.won30d)}
        delta={
          kpis.conversionPct != null
            ? `${kpis.conversionPct}% of closed`
            : 'no closed leads yet'
        }
        deltaTone={kpis.conversionPct != null && kpis.conversionPct >= 50 ? 'green' : 'gray'}
      />
    </div>
  );
}
