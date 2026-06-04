'use client';

/**
 * Client shell for /admin/brians-stuff with four tabs:
 *   - Landing Page Playbook
 *   - Upsell A/B Tracker
 *   - Leads (lead capture + visitor pixel data)
 *   - Documentation (IP enrichment vendor research)
 *
 * Server passes pre-rendered panel content as ReactNode props so heavy DB
 * queries stay server-side; this component just toggles which panel is
 * visible.
 *
 * Initial tab is driven by ?tab= query param so deep links + redirects from
 * the old /admin/upsell-tracker URL still land on the right panel.
 */

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type TabKey =
  | 'playbook'
  | 'upsell'
  | 'leads'
  | 'events'
  | 'magnets'
  | 'seo'
  | 'docs';

export default function BriansStuffTabs({
  playbook,
  tracker,
  leads,
  events,
  magnets,
  seo,
  docs,
  initialTab = 'playbook',
}: {
  playbook: ReactNode;
  tracker: ReactNode;
  leads: ReactNode;
  events: ReactNode;
  magnets: ReactNode;
  seo: ReactNode;
  docs: ReactNode;
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === 'playbook') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, [tab]);

  return (
    <div className="-m-6 md:-m-8 lg:-m-10">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 md:px-10 flex gap-1 overflow-x-auto">
          <TabButton active={tab === 'playbook'} onClick={() => setTab('playbook')}>
            📘 Landing Page Playbook
          </TabButton>
          <TabButton active={tab === 'upsell'} onClick={() => setTab('upsell')}>
            ★ Upsell A/B Tracker
          </TabButton>
          <TabButton active={tab === 'leads'} onClick={() => setTab('leads')}>
            🎯 Leads
          </TabButton>
          <TabButton active={tab === 'events'} onClick={() => setTab('events')}>
            🎉 Event Invites
          </TabButton>
          <TabButton active={tab === 'magnets'} onClick={() => setTab('magnets')}>
            🎁 Lead Magnets
          </TabButton>
          <TabButton active={tab === 'seo'} onClick={() => setTab('seo')}>
            🔭 SEO Intelligence
          </TabButton>
          <TabButton active={tab === 'docs'} onClick={() => setTab('docs')}>
            📚 Enrichment Docs
          </TabButton>
        </div>
      </div>

      {/* Mount all panels but hide inactive — keeps server-rendered content
          warm when toggling tabs. */}
      <div hidden={tab !== 'playbook'}>{playbook}</div>
      <div hidden={tab !== 'upsell'} className="px-6 md:px-10 py-8">
        {tracker}
      </div>
      <div hidden={tab !== 'leads'} className="px-6 md:px-10 py-8">
        {leads}
      </div>
      <div hidden={tab !== 'events'} className="px-6 md:px-10 py-8">
        {events}
      </div>
      <div hidden={tab !== 'magnets'} className="px-6 md:px-10 py-8">
        {magnets}
      </div>
      <div hidden={tab !== 'seo'} className="px-6 md:px-10 py-8">
        {seo}
      </div>
      <div hidden={tab !== 'docs'} className="px-6 md:px-10 py-8">
        {docs}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap"
      style={{
        borderColor: active ? '#7C3AED' : 'transparent',
        color: active ? '#5B21B6' : '#6B7280',
      }}
    >
      {children}
    </button>
  );
}
