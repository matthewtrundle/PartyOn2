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
import TabErrorBoundary from '@/components/admin/TabErrorBoundary';

type TabKey =
  | 'playbook'
  | 'experiments'
  | 'upsell'
  | 'leads'
  | 'events'
  | 'magnets'
  | 'seo'
  | 'pathways'
  | 'logic'
  | 'docs'
  | 'str';

export default function BriansStuffTabs({
  playbook,
  experiments,
  tracker,
  leads,
  events,
  magnets,
  seo,
  pathways,
  logic,
  docs,
  str,
  initialTab = 'playbook',
}: {
  playbook: ReactNode;
  experiments: ReactNode;
  tracker: ReactNode;
  leads: ReactNode;
  events: ReactNode;
  magnets: ReactNode;
  seo: ReactNode;
  pathways: ReactNode;
  logic: ReactNode;
  docs: ReactNode;
  str: ReactNode;
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
      <div className="sticky top-[var(--pod-appbar-h,0px)] z-20 bg-white border-b border-gray-200">
        {/* Wrap onto multiple rows when the label count exceeds one row's
            width. The old `overflow-x-auto` clipped labels behind a
            silent scrollbar so half the tabs were invisible on 13"
            laptops. flex-wrap + generous vertical padding gives every
            tab a real touch target. */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-wrap gap-x-1 gap-y-0.5 py-1">
          <TabButton active={tab === 'playbook'} onClick={() => setTab('playbook')}>
            📘 Landing Page Playbook
          </TabButton>
          <TabButton active={tab === 'experiments'} onClick={() => setTab('experiments')}>
            🧪 Experiments &amp; Funnels
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
          <TabButton active={tab === 'pathways'} onClick={() => setTab('pathways')}>
            🛒 Order Pathways
          </TabButton>
          <TabButton active={tab === 'logic'} onClick={() => setTab('logic')}>
            🧮 Recommendation Logic
          </TabButton>
          <TabButton active={tab === 'docs'} onClick={() => setTab('docs')}>
            📚 Enrichment Docs
          </TabButton>
          <TabButton active={tab === 'str'} onClick={() => setTab('str')}>
            🏡 STR Partners
          </TabButton>
        </div>
      </div>

      {/* Mount all panels but hide inactive — keeps server-rendered content
          warm when toggling tabs. Each panel wrapped in its own error
          boundary so a single tab crash doesn't take the whole page down. */}
      <div hidden={tab !== 'playbook'}>
        <TabErrorBoundary tabName="Landing Page Playbook">{playbook}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'experiments'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Experiments & Funnels">{experiments}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'upsell'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Upsell A/B Tracker">{tracker}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'leads'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Leads">{leads}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'events'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Event Invites">{events}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'magnets'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Lead Magnets">{magnets}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'seo'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="SEO Intelligence">{seo}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'pathways'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Order Pathways">{pathways}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'logic'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Recommendation Logic">{logic}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'docs'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="Enrichment Docs">{docs}</TabErrorBoundary>
      </div>
      <div hidden={tab !== 'str'} className="px-6 md:px-10 py-8">
        <TabErrorBoundary tabName="STR Partners">{str}</TabErrorBoundary>
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
      className="px-3 py-2.5 text-[13px] sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap rounded-t-md hover:bg-purple-50/50"
      style={{
        borderColor: active ? '#7C3AED' : 'transparent',
        color: active ? '#5B21B6' : '#4B5563',
        background: active ? 'rgba(124,58,237,0.06)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}
