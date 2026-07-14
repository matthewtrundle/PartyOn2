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

import { useMemo, useState, type ReactElement } from 'react';
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

export default function StrPartnersView(): ReactElement {
  const prospects = prospectsData as Prospect[];
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

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
              <tr key={p.website}>
                <td className="p-3 min-w-[180px]">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
