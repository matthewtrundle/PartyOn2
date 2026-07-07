'use client';

// Internal preview directory.
// Renders each landing page in an iframe so we can compare side-by-side
// without internal scrolling — switch via tabs.

import { useState } from 'react';

type Tab = {
  key: string;
  label: string;
  url: string;
  description: string;
  accent: string;
};

const TABS: Tab[] = [
  {
    key: 'bachelor',
    label: 'Bachelor Party',
    url: '/austin-bachelor-party-delivery',
    description: 'Energetic, party-forward — Lake Travis, Rainey Street, party buses.',
    accent: '#F2D34F',
  },
  {
    key: 'bachelorette',
    label: 'Bachelorette',
    url: '/austin-bachelorette-party-delivery',
    description: 'Light & elegant — champagne, mimosa bars, hotel suites.',
    accent: '#F5B0C5',
  },
  {
    key: 'corporate',
    label: 'Corporate Event',
    url: '/austin-corporate-event-delivery',
    description: 'Premium luxury vibe — offsites, client dinners, itemized invoicing.',
    accent: '#C8A96A',
  },
  {
    key: 'wedding',
    label: 'Wedding Weekend',
    url: '/austin-wedding-weekend-delivery',
    description: 'Sophisticated, multi-event — coordinated across the whole weekend.',
    accent: '#C8A96A',
  },
];

export default function LandingPagesDirectory() {
  const [activeKey, setActiveKey] = useState(TABS[0].key);
  const active = TABS.find((t) => t.key === activeKey)!;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h1 className="font-bold text-xl sm:text-2xl text-gray-900">
                Party On Delivery — Landing Pages
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Side-by-side preview of all event landing pages. Click a tab to view —
                each iframe scrolls independently inside the embedded page.
              </p>
            </div>
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold px-4 py-2 rounded-md border-2 transition-colors"
              style={{
                borderColor: active.accent,
                color: '#0A1F33',
              }}
            >
              Open full-screen ↗
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto -mb-1 pb-1">
            {TABS.map((t) => {
              const isActive = t.key === activeKey;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveKey(t.key)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2"
                  style={{
                    borderBottomColor: isActive ? t.accent : 'transparent',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0A1F33' : '#6B7280',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Active tab description */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: active.accent }}
            />
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">{active.label}</strong> — {active.description}
            </p>
          </div>
          <code className="text-xs text-gray-500 font-mono">{active.url}</code>
        </div>
      </div>

      {/* Iframe area */}
      <div className="flex-1 px-4 sm:px-6 py-4">
        <div
          className="max-w-7xl mx-auto bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200"
          style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
        >
          <iframe
            key={active.key}
            src={active.url}
            title={`${active.label} landing page preview`}
            className="w-full h-full border-0"
          />
        </div>
        <p className="text-xs text-gray-500 text-center mt-3 max-w-7xl mx-auto">
          Tip: scroll inside the frame to view the full landing page. Click the
          <strong className="mx-1">Open full-screen</strong>
          link in the header to view it in its own tab without an iframe.
        </p>
      </div>
    </div>
  );
}
