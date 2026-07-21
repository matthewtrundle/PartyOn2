'use client';

/**
 * Brian's Stuff → STR Partners tab
 *
 * Prospect list of Austin short-term-rental companies (5+ homes) with
 * everything needed to create their partner page and reach out: website,
 * contact, email, phone, socials, and scraped logo. Data lives in
 * src/data/str-partner-prospects.json (compiled by research, logos
 * resolved via src/lib/partners/logo-scraper.ts).
 *
 * Workflow: review here → create partner pages via
 * /admin/affiliates/bulk-import (the "Copy CSV" button emits rows in the
 * exact import format) → the `partnerSlug` field flips a row to
 * "Created" with a link to its live page.
 */

import { Fragment, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import prospectsData from '@/data/str-partner-prospects.json';

interface Socials {
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
}

/** Deep-researched sales profile attached to a prospect row. */
interface Enrichment {
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

interface Prospect {
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

/**
 * Master outreach template — the full "everything Party On Delivery does
 * for STR partners" pitch. Personalized per-lead versions live in each
 * prospect's enrichment.outreachEmail; this is the base to adapt.
 */
const MASTER_OUTREACH = {
  subject: 'Free guest perk for {{Company}} — stocked fridges, zero work for your team',
  body: `Hi {{FirstName}},

I'm Brian, founder of Party On Delivery — Austin's premium alcohol delivery and guest-concierge service. We partner with short-term rental companies like {{Company}} to give your guests a five-star arrival experience without adding a single task to your team's plate.

Here's everything a partnership includes:

• FREE DELIVERY FOR YOUR GUESTS — every guest who books through your link gets free alcohol delivery to their rental (a real perk you can advertise on your listings).
• PRE-ARRIVAL STOCKING — drinks iced, arranged, and waiting when guests walk in. We coordinate timing with your check-ins.
• YOUR OWN BRANDED PAGE — a co-branded page (your logo, your look) at partyondelivery.com/partners/{{slug}} that you drop into welcome emails, guidebooks, or listing descriptions.
• A PERSONAL PARTY DASHBOARD FOR EVERY GROUP — one click and each group gets their own private ordering dashboard: everyone in the party adds what they want, splits payment their own way, zero group-text math. Perfect for bachelorette and birthday groups.
• FULL CATALOG — spirits, beer, wine, seltzers, champagne, cocktail kits, mixers, bulk ice, and cups. Custom item requests honored whenever we can source them.
• SAME-DAY AND LAST-MINUTE — TABC-licensed, always on time, with money-back on unopened returns (up to 25% of the order) so groups can over-buy risk-free.
• YOU EARN ON EVERY ORDER — partners earn a commission on every guest order, tracked in your own partner portal where you can see each dashboard your guests create, how engaged they are, and what they ordered.
• ZERO LIFT — no inventory, no liability, no staff time. You share a link; we do everything else.

We already do this for Austin STR and boat-party operators, and guests consistently call it out in reviews.

Worth a 15-minute call this week? I can have your branded page live the same day.

Brian Hill
Founder, Party On Delivery
partyondelivery.com · (737) 371-9700`,
};

export default function StrPartnersView(): ReactElement {
  const prospects = prospectsData as Prospect[];
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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
  const withLogo = prospects.filter((p) => p.logoUrl).length;
  const created = prospects.filter((p) => p.partnerSlug).length;

  const copyBulkImportCsv = async () => {
    const header = 'business_name,website,category,commission_percent,contact_name,email,phone';
    const rows = filtered
      .filter((p) => !p.partnerSlug)
      .map((p) =>
        [
          csvEscape(p.name),
          csvEscape(p.website),
          'LODGING',
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">STR Partners — Austin prospect list</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          Austin short-term-rental companies (~5+ homes) with everything needed to build
          their partner page and reach out. {prospects.length} companies · {withContact} with
          direct contact info · {withLogo} logos scraped · {created} partner page{created === 1 ? '' : 's'} created.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, website, contact, email…"
          className="flex-1 min-w-[240px] rounded-lg border-2 border-gray-200 px-4 py-2.5 text-base focus:border-brand-blue focus:outline-none"
        />
        <button type="button" onClick={copyBulkImportCsv} className="btn-primary px-4 py-2.5 text-sm">
          {copied ? 'Copied ✓' : 'Copy CSV for Bulk Import'}
        </button>
        <Link href="/admin/affiliates/bulk-import" className="btn-secondary px-4 py-2.5 text-sm">
          Open Bulk Import
        </Link>
      </div>

      {/* Master outreach template */}
      <details className="mb-4 rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer p-3 font-bold text-gray-900 text-sm">
          ✉️ Master outreach template (everything POD does — adapt per lead)
        </summary>
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-700 font-semibold mb-2">
            Subject: {MASTER_OUTREACH.subject}
          </p>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 rounded-lg p-4 border border-gray-100">
            {MASTER_OUTREACH.body}
          </pre>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(
                `Subject: ${MASTER_OUTREACH.subject}\n\n${MASTER_OUTREACH.body}`
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
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Logo</th>
              <th className="text-left p-3">Homes</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Email / phone</th>
              <th className="text-left p-3">Socials</th>
              <th className="text-left p-3">About</th>
              <th className="text-left p-3">Partner page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 align-top">
            {filtered.map((p) => (
              <Fragment key={p.website}>
              <tr>
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
                <td className="p-3 text-gray-600 max-w-[280px]">{p.description}</td>
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
                  <td colSpan={8} className="p-4 md:p-6">
                    <EnrichmentPanel
                      prospect={p}
                      onCopyEmail={() => copyOutreach(p)}
                      emailCopied={copiedEmail === p.website}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Expanded dropdown: the researched profile + personalized outreach draft. */
function EnrichmentPanel({
  prospect,
  onCopyEmail,
  emailCopied,
}: {
  prospect: Prospect;
  onCopyEmail: () => void;
  emailCopied: boolean;
}): ReactElement {
  const e = prospect.enrichment!;
  return (
    <div className="max-w-5xl">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Enriched profile — {prospect.name}
        </h3>
        <span className="text-xs text-gray-500">researched {e.enrichedAt}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Management</h4>
          <dl className="text-sm text-gray-700 space-y-1">
            {e.management.ownerName && <div><span className="font-semibold">Owner:</span> {e.management.ownerName}</div>}
            {e.management.ownerNotes && <div className="text-gray-600">{e.management.ownerNotes}</div>}
            {e.management.team && <div><span className="font-semibold">Team:</span> {e.management.team}</div>}
            {e.management.operatingSince && <div><span className="font-semibold">Operating since:</span> {e.management.operatingSince}</div>}
            {e.management.entity && <div><span className="font-semibold">Entity:</span> {e.management.entity}</div>}
            {e.management.linkedin && (
              <div>
                <a href={e.management.linkedin} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">LinkedIn</a>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Portfolio</h4>
          <dl className="text-sm text-gray-700 space-y-1">
            <div><span className="font-semibold">Properties:</span> {e.portfolio.propertyCount}</div>
            <div><span className="font-semibold">Types:</span> {e.portfolio.propertyTypes}</div>
            <div><span className="font-semibold">Locations:</span> {e.portfolio.locations}</div>
            {e.portfolio.maxGroupSize && (
              <div><span className="font-semibold">Largest groups:</span> {e.portfolio.maxGroupSize}</div>
            )}
          </dl>
          {e.portfolio.notableProperties.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-0.5">
              {e.portfolio.notableProperties.map((np) => (
                <li key={np.name}><span className="font-medium text-gray-800">{np.name}</span> — {np.blurb}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Business</h4>
          <dl className="text-sm text-gray-700 space-y-1">
            <div><span className="font-semibold">Booking model:</span> {e.business.bookingModel}</div>
            <div><span className="font-semibold">Services:</span> {e.business.services}</div>
            <div><span className="font-semibold">Positioning:</span> {e.business.positioning}</div>
            <div><span className="font-semibold">Guests:</span> {e.business.guestDemographic}</div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Reputation</h4>
          <p className="text-sm text-gray-700">{e.reputation.summary}</p>
          {e.reputation.ratings && <p className="text-sm text-gray-600 mt-1">{e.reputation.ratings}</p>}
          {e.reputation.praiseThemes && (
            <p className="text-sm text-gray-600 mt-1"><span className="font-semibold text-gray-800">Guests praise:</span> {e.reputation.praiseThemes}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Partnership angles</h4>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
          {e.partnershipAngles.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg border-2 border-brand-blue/30 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Personalized outreach draft
          </h4>
          <button type="button" onClick={onCopyEmail} className="btn-primary px-4 py-2 text-sm">
            {emailCopied ? 'Copied ✓' : 'Copy email'}
          </button>
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Subject: {e.outreachEmail.subject}</p>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 rounded-lg p-4 border border-gray-100">
          {e.outreachEmail.body}
        </pre>
      </div>
    </div>
  );
}
