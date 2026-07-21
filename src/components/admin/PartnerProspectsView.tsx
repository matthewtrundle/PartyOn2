'use client';

/**
 * Generic partner-prospect database view (Partners → STR / Bartending
 * Prospects).
 *
 * Renders a searchable prospect table (website, logo, contact, socials,
 * partner-page status), a category master outreach template, per-row
 * enrichment dropdowns with a personalized outreach draft, a "Copy CSV
 * for Bulk Import" button, and the outreach-campaign controls:
 *   - Sync to CRM — upserts every company as a tagged Lead
 *     ('partner-prospect' + vertical; 'partner-active' when signed)
 *   - Send test to info@ — the mandatory pre-send review of each email
 *   - Enroll selected (≤10) — queues the 2-touch partner-outreach
 *     journey; NOTHING sends while its feature flag is off
 *
 * Category tabs are thin wrappers passing their JSON data + labels —
 * see StrPartnersView.tsx and BartendingPartnersView.tsx.
 */

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import ProspectEnrichmentPanel from '@/components/admin/ProspectEnrichmentPanel';

interface Socials {
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
}

/** Deep-researched sales profile attached to a prospect row. */
export interface Enrichment {
  enrichedAt: string;
  management: {
    ownerName: string | null;
    ownerNotes: string | null;
    team: string | null;
    linkedin: string | null;
    operatingSince: string | null;
    entity: string | null;
  };
  portfolio: {
    propertyCount: string;
    propertyTypes: string;
    locations: string;
    maxGroupSize: string | null;
    notableProperties: { name: string; blurb: string }[];
  };
  business: {
    bookingModel: string;
    services: string;
    positioning: string;
    guestDemographic: string;
  };
  reputation: {
    summary: string;
    ratings: string | null;
    praiseThemes: string | null;
  };
  partnershipAngles: string[];
  outreachEmail: { subject: string; body: string };
}

export interface Prospect {
  name: string;
  website: string;
  propertiesEstimate: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  socials: Socials;
  logoUrl: string | null;
  description: string;
  /** Set once the partner page exists — links the row to /partners/<slug>. */
  partnerSlug?: string | null;
  /** Deep-researched profile + personalized outreach draft (dropdown). */
  enrichment?: Enrichment | null;
}

export interface ProspectViewConfig {
  title: string;
  intro: string;
  /** Table-column header for propertiesEstimate (e.g. "Homes", "Scale"). */
  sizeLabel: string;
  /** Enrichment-panel labels for the portfolio card. */
  portfolioLabels: {
    heading: string;
    count: string;
    types: string;
    locations: string;
    maxGroupSize: string;
  };
  /** AffiliateCategory used in the bulk-import CSV. */
  csvCategory: string;
  masterOutreach: { subject: string; body: string };
}

interface LeadState {
  leadId: string;
  tags: string[];
  campaign: string; // none | enrolled | sent | replied
}

const SOCIAL_LABELS: [keyof Socials, string][] = [
  ['instagram', 'IG'],
  ['facebook', 'FB'],
  ['linkedin', 'LI'],
  ['twitter', 'X'],
  ['youtube', 'YT'],
  ['tiktok', 'TT'],
];

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Mirror of websiteKey() in src/lib/partners/prospect-datasets.ts. */
function websiteKey(website: string): string {
  try {
    const u = new URL(website);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return website.toLowerCase();
  }
}

const CAMPAIGN_CHIP: Record<string, { label: string; cls: string }> = {
  replied: { label: '💬 Replied', cls: 'bg-purple-100 text-purple-800' },
  sent: { label: '✉️ Sent', cls: 'bg-green-100 text-green-800' },
  enrolled: { label: '⏳ Enrolled', cls: 'bg-blue-100 text-blue-800' },
};

export default function PartnerProspectsView({
  config,
  prospects,
}: {
  config: ProspectViewConfig;
  prospects: Prospect[];
}): ReactElement {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [leadMap, setLeadMap] = useState<Record<string, LeadState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshLeadMap = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/partner-prospects/sync');
      const json = await res.json();
      if (json.success) setLeadMap(json.data.leads);
    } catch {
      /* soft-fail — table still renders */
    }
  }, []);

  useEffect(() => {
    void refreshLeadMap();
  }, [refreshLeadMap]);

  const copyOutreach = async (p: Prospect) => {
    if (!p.enrichment) return;
    await navigator.clipboard.writeText(
      `Subject: ${p.enrichment.outreachEmail.subject}\n\n${p.enrichment.outreachEmail.body}`
    );
    setCopiedEmail(p.website);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.website.toLowerCase().includes(q) ||
        (p.contactName ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
    );
  }, [prospects, search]);

  const withContact = prospects.filter((p) => p.email || p.phone).length;
  const enriched = prospects.filter((p) => p.enrichment).length;
  const created = prospects.filter((p) => p.partnerSlug).length;
  const synced = prospects.filter((p) => leadMap[websiteKey(p.website)]).length;

  const copyBulkImportCsv = async () => {
    const header = 'business_name,website,category,commission_percent,contact_name,email,phone';
    const rows = filtered
      .filter((p) => !p.partnerSlug)
      .map((p) =>
        [
          csvEscape(p.name),
          csvEscape(p.website),
          config.csvCategory,
          '10',
          csvEscape(p.contactName ?? ''),
          csvEscape(p.email ?? ''),
          csvEscape(p.phone ?? ''),
        ].join(',')
      );
    await navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const syncToCrm = async () => {
    setBusy('sync');
    setNotice(null);
    try {
      const res = await fetch('/api/v1/admin/partner-prospects/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotice(
        `CRM sync: ${json.data.created} created, ${json.data.updated} updated, ${json.data.taggedActive} tagged active partner.`
      );
      await refreshLeadMap();
    } catch (err) {
      setNotice(`Sync failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusy(null);
    }
  };

  const testSend = async (website: string) => {
    setBusy(`test:${website}`);
    setNotice(null);
    try {
      const res = await fetch('/api/v1/admin/partner-prospects/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website }),
      });
      const json = await res.json();
      setNotice(json.success ? `Test sent to ${json.data.to}.` : `Test failed: ${json.error}`);
    } catch {
      setNotice('Test failed: network error');
    } finally {
      setBusy(null);
    }
  };

  const enrollSelected = async () => {
    const websites = [...selected].slice(0, 10);
    if (websites.length === 0) return;
    if (
      !confirm(
        `Enroll ${websites.length} prospect(s) in the 2-touch outreach campaign?\n\nEmails only go out once the partner-outreach flag is ON (currently sends are held).`
      )
    )
      return;
    setBusy('enroll');
    setNotice(null);
    try {
      const res = await fetch('/api/v1/admin/partner-prospects/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websites }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const skipped = json.data.results.filter((r: { ok: boolean }) => !r.ok);
      setNotice(
        `Enrolled ${json.data.enrolled}/${websites.length}.` +
          (skipped.length
            ? ` Skipped: ${skipped
                .map((r: { website: string; reason?: string }) => `${websiteKey(r.website)} (${r.reason})`)
                .join(', ')}`
            : '')
      );
      setSelected(new Set());
      await refreshLeadMap();
    } catch (err) {
      setNotice(`Enroll failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusy(null);
    }
  };

  const toggleSelected = (website: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(website)) next.delete(website);
      else if (next.size < 10) next.add(website);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          {config.intro} {prospects.length} companies · {withContact} with direct contact
          info · {enriched} enriched · {synced} in CRM · {created} partner page
          {created === 1 ? '' : 's'} created.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, website, contact, email…"
          className="flex-1 min-w-[240px] rounded-lg border-2 border-gray-200 px-4 py-2.5 text-base focus:border-brand-blue focus:outline-none"
        />
        <button type="button" onClick={copyBulkImportCsv} className="btn-secondary px-4 py-2.5 text-sm">
          {copied ? 'Copied ✓' : 'Copy CSV for Bulk Import'}
        </button>
        <Link href="/admin/affiliates/bulk-import" className="btn-ghost px-3 py-2.5">
          Open Bulk Import
        </Link>
      </div>

      {/* Campaign controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          type="button"
          onClick={syncToCrm}
          disabled={busy !== null}
          className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === 'sync' ? 'Syncing…' : 'Sync to CRM'}
        </button>
        <button
          type="button"
          onClick={enrollSelected}
          disabled={busy !== null || selected.size === 0}
          className="btn-cart px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === 'enroll' ? 'Enrolling…' : `Enroll selected in campaign (${selected.size}/10)`}
        </button>
        <span className="text-sm text-gray-500">
          Campaign sends are held until the partner-outreach flag is switched on.
        </span>
      </div>

      {notice && (
        <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
          {notice}
        </div>
      )}

      {/* Master outreach template */}
      <details className="mb-4 rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer p-3 font-bold text-gray-900 text-sm">
          ✉️ Master outreach template (everything POD does — adapt per lead)
        </summary>
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-700 font-semibold mb-2">
            Subject: {config.masterOutreach.subject}
          </p>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 rounded-lg p-4 border border-gray-100">
            {config.masterOutreach.body}
          </pre>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(
                `Subject: ${config.masterOutreach.subject}\n\n${config.masterOutreach.body}`
              )
            }
            className="mt-2 btn-secondary px-4 py-2 text-sm"
          >
            Copy template
          </button>
        </div>
      </details>

      <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
            <tr>
              <th className="p-3"></th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Logo</th>
              <th className="text-left p-3">{config.sizeLabel}</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Email / phone</th>
              <th className="text-left p-3">Socials</th>
              <th className="text-left p-3">Campaign</th>
              <th className="text-left p-3">Partner page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 align-top">
            {filtered.map((p) => {
              const state = leadMap[websiteKey(p.website)];
              const chip = state ? CAMPAIGN_CHIP[state.campaign] : undefined;
              const active = state?.tags.includes('partner-active');
              return (
              <Fragment key={p.website}>
              <tr>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.website)}
                    onChange={() => toggleSelected(p.website)}
                    disabled={!p.email || !state}
                    title={!p.email ? 'No email' : !state ? 'Run Sync to CRM first' : 'Select for campaign'}
                    className="mt-1 h-4 w-4 accent-[#0B74B8]"
                  />
                </td>
                <td className="p-3 min-w-[200px]">
                  <div className="flex items-start gap-1.5">
                    {p.enrichment && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === p.website ? null : p.website)}
                        className="mt-0.5 text-brand-blue font-bold text-sm leading-none"
                        aria-label={expanded === p.website ? 'Collapse enrichment' : 'Expand enrichment'}
                      >
                        {expanded === p.website ? '▾' : '▸'}
                      </button>
                    )}
                    <div>
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {p.name}
                      </a>
                      <div className="text-xs text-gray-500 break-all">
                        {p.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </div>
                      {p.enrichment && (
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === p.website ? null : p.website)}
                          className="mt-1 inline-block text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded"
                        >
                          ✦ Enriched — {expanded === p.website ? 'hide' : 'view'}
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tiny external thumbnails, optimizer proxying not wanted
                    <img
                      src={p.logoUrl}
                      alt={`${p.name} logo`}
                      className="h-10 w-16 object-contain bg-gray-50 rounded"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">wordmark</span>
                  )}
                </td>
                <td className="p-3 text-gray-700 whitespace-nowrap">{p.propertiesEstimate}</td>
                <td className="p-3 text-gray-700 min-w-[110px]">{p.contactName ?? '—'}</td>
                <td className="p-3 min-w-[180px]">
                  {p.email ? (
                    <a href={`mailto:${p.email}`} className="text-brand-blue hover:underline break-all">
                      {p.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">no email</span>
                  )}
                  <div>
                    {p.phone ? (
                      <a href={`tel:${p.phone}`} className="text-gray-700 hover:underline">
                        {p.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">no phone</span>
                    )}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {SOCIAL_LABELS.filter(([key]) => p.socials?.[key]).map(([key, label]) => (
                    <a
                      key={key}
                      href={p.socials[key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mr-1.5 text-xs font-bold text-brand-blue hover:underline"
                    >
                      {label}
                    </a>
                  ))}
                  {!SOCIAL_LABELS.some(([key]) => p.socials?.[key]) && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex flex-col items-start gap-1">
                    {active && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                        🤝 Active Partner
                      </span>
                    )}
                    {chip && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${chip.cls}`}>{chip.label}</span>
                    )}
                    {state && (
                      <Link
                        href={`/admin/leads?lead=${state.leadId}`}
                        className="text-xs text-brand-blue hover:underline"
                      >
                        Lead →
                      </Link>
                    )}
                    {p.enrichment && p.email && (
                      <button
                        type="button"
                        onClick={() => testSend(p.website)}
                        disabled={busy !== null}
                        className="text-xs text-gray-600 underline disabled:opacity-50"
                      >
                        {busy === `test:${p.website}` ? 'Sending…' : 'Test → info@'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {p.partnerSlug ? (
                    <a
                      href={`/partners/${p.partnerSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-green-700 hover:underline"
                    >
                      ✓ /partners/{p.partnerSlug}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">not created</span>
                  )}
                </td>
              </tr>
              {p.enrichment && expanded === p.website && (
                <tr className="bg-blue-50/40">
                  <td colSpan={9} className="p-4 md:p-6">
                    <ProspectEnrichmentPanel
                      prospect={p}
                      labels={config.portfolioLabels}
                      onCopyEmail={() => copyOutreach(p)}
                      emailCopied={copiedEmail === p.website}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
