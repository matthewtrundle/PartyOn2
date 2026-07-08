import Link from 'next/link';
import { LEAD_MAGNETS } from '@/lib/leadMagnet/config';

/**
 * Brian's Stuff → Lead Magnets tab.
 *
 * Read-only documentation + live config view for the lead-magnet system.
 * Engineers edit `src/lib/leadMagnet/config.ts` to add or tune magnets;
 * this tab is where Brian verifies the wiring + reads the playbook.
 */
export default function LeadMagnetView() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-md border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-xl font-bold text-amber-900 tracking-wide">
          🎁 Lead Magnet System
        </h2>
        <p className="text-sm text-amber-900 mt-2 leading-relaxed">
          Per-page popups that pitch a downloadable PDF, video, or guide in
          exchange for a name + email + (optional) phone. All submissions
          flow into the{' '}
          <Link href="?tab=leads" className="underline font-semibold">
            Leads table
          </Link>{' '}
          tagged with the magnet&apos;s id.
        </p>
        <p className="text-xs text-amber-800 mt-2 italic">
          Triggers supported: <strong>time on page</strong>,{' '}
          <strong>scroll depth</strong>, and{' '}
          <strong>manual</strong> (any button can force-open via{' '}
          <code>window.dispatchEvent</code>).
        </p>
      </div>

      {/* Active magnets */}
      <Section title="Active magnets">
        {LEAD_MAGNETS.length === 0 && (
          <p className="text-sm text-gray-600 italic">
            No magnets defined. Edit{' '}
            <code>src/lib/leadMagnet/config.ts</code> to add one.
          </p>
        )}
        <div className="space-y-3">
          {LEAD_MAGNETS.map((m) => (
            <div
              key={m.id}
              className="rounded-md border p-4 bg-white"
              style={{ borderColor: m.enabled ? '#D4AF37' : '#E5E7EB' }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-gray-900">
                      {m.title}
                    </h3>
                    {m.enabled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        ENABLED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        DISABLED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    id: <code>{m.id}</code>
                  </div>
                </div>
                <Link
                  href={m.rewardUrl}
                  target="_blank"
                  className="px-3 py-1.5 rounded-md text-xs font-bold tracking-widest bg-gray-900 text-white hover:bg-gray-700 whitespace-nowrap"
                >
                  OPEN REWARD →
                </Link>
              </div>
              <p className="text-sm text-gray-700 mb-2">{m.subhead}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <Field label="Pages" value={m.pages.join(', ')} />
                <Field
                  label="Excluded"
                  value={(m.excludePages ?? []).join(', ') || '—'}
                />
                <Field
                  label="Triggers"
                  value={m.triggers
                    .map((t) =>
                      t.type === 'time'
                        ? `time:${t.seconds}s`
                        : t.type === 'scroll'
                          ? `scroll:${t.percent}%`
                          : t.type,
                    )
                    .join(' · ')}
                />
                <Field label="Cooldown" value={`${m.cooldownDays} days`} />
                <Field label="CTA" value={m.cta} />
                <Field
                  label="Asks for phone"
                  value={m.askPhone ? 'Yes' : 'No'}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* How to trigger manually */}
      <Section title="Force-open from any button">
        <p className="text-sm text-gray-700 mb-2">
          The flyer page&apos;s &quot;Email me the PDF&quot; button uses this
          pattern — drop it on any client component to pop the magnet.
        </p>
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-x-auto">
{`window.dispatchEvent(
  new CustomEvent('lead-magnet:open', {
    detail: { id: 'pod-services-flyer-2026' },
  }),
);`}
        </pre>
      </Section>

      {/* How to add a new magnet */}
      <Section title="Adding a new magnet">
        <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-700">
          <li>
            Open <code>src/lib/leadMagnet/config.ts</code> and copy one of the
            existing entries in <code>LEAD_MAGNETS</code>.
          </li>
          <li>
            Give it a unique <code>id</code> (used for cooldown storage +
            lead-event metadata).
          </li>
          <li>
            Set <code>pages</code> (where it fires) and{' '}
            <code>excludePages</code> (where it never fires). Glob style:
            <code>&apos;/austin-*-party-delivery&apos;</code>.
          </li>
          <li>
            Pick one or more <code>triggers</code> — time, scroll, and/or
            manual.
          </li>
          <li>
            Set <code>rewardUrl</code> to the page or PDF you want the user to
            land on after submitting. Could be <code>/flyer</code>, a Notion
            doc, a Google Drive PDF, anything.
          </li>
          <li>
            Set <code>cooldownDays</code> — how long before the same browser
            sees it again. 0 = every page load (good for QA), 7+ = recommended
            for production.
          </li>
          <li>Commit + deploy. It&apos;s live.</li>
        </ol>
      </Section>

      {/* Test the live magnet */}
      <Section title="Test it">
        <p className="text-sm text-gray-700 mb-3">
          Open the flyer page in a new tab. The popup is on a 7-day cooldown
          by default — clear <code>localStorage</code> in DevTools to reset:
        </p>
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-x-auto">
{`// Run in browser DevTools:
Object.keys(localStorage)
  .filter((k) => k.startsWith('pod_lm_seen_'))
  .forEach((k) => localStorage.removeItem(k));`}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/flyer"
            target="_blank"
            className="px-4 py-2 rounded-md bg-gray-900 text-white font-bold text-xs tracking-widest"
          >
            🪄 OPEN /FLYER →
          </Link>
          <Link
            href="/austin-bachelor-party-delivery"
            target="_blank"
            className="px-4 py-2 rounded-md bg-white border-2 border-gray-900 text-gray-900 font-bold text-xs tracking-widest"
          >
            BACHELOR LANDING →
          </Link>
        </div>
      </Section>

      <Section title="Component map">
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-x-auto">
{`src/
├── app/flyer/page.tsx                              ← public flyer route
├── components/flyer/FlyerContent.tsx               ← luxury content (also prints to PDF)
├── components/leadMagnet/
│   ├── LeadMagnetController.tsx                    ← mounted in layout, watches triggers
│   └── LeadMagnetModal.tsx                         ← shared popup UI
└── lib/leadMagnet/config.ts                        ← EDIT THIS to add/tune magnets`}
        </pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5">
      <h2 className="text-lg font-bold tracking-wide text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
      <div className="text-[10px] font-bold tracking-widest text-gray-500">
        {label.toUpperCase()}
      </div>
      <div className="text-xs text-gray-800 mt-0.5 break-words font-mono">{value}</div>
    </div>
  );
}
