'use client';

/**
 * /admin/affiliates/bulk-import
 *
 * Bulk partner creation: paste CSV rows or upload a .csv file, preview
 * the parsed rows, create them all in one call, and get per-row results
 * with ready-to-share partner-page links.
 *
 * CSV columns (header row required, order-insensitive):
 *   business_name, website, category, commission_percent, contact_name, email, phone
 * category ∈ BARTENDER | BOAT | VENUE | LODGING | PLANNER | OTHER
 *
 * Parsing happens client-side (no server multipart handling, no new
 * deps); the API receives clean JSON rows.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';

const CATEGORIES = ['BARTENDER', 'BOAT', 'VENUE', 'LODGING', 'PLANNER', 'OTHER'];

type ParsedRow = {
  businessName: string;
  website: string;
  category: string;
  commissionPercent: number | null;
  contactName: string;
  email: string | null;
  phone: string | null;
  problem: string | null;
};

type RowResult = {
  businessName: string;
  ok: boolean;
  error?: string;
  slug?: string;
  code?: string;
  partnerUrl?: string;
  logoUrl?: string | null;
  placeholderEmail?: boolean;
};

/** Minimal CSV parser — handles quoted fields + commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function toRows(text: string): ParsedRow[] {
  const grid = parseCsv(text.trim());
  if (grid.length < 2) return [];
  const header = grid[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = (name: string) => header.indexOf(name);
  const iBiz = idx('business_name') >= 0 ? idx('business_name') : idx('company_name');
  const iWeb = idx('website');
  const iCat = idx('category') >= 0 ? idx('category') : idx('type');
  const iCom = idx('commission_percent') >= 0 ? idx('commission_percent') : idx('commission');
  const iName = idx('contact_name');
  const iEmail = idx('email');
  const iPhone = idx('phone');

  return grid.slice(1).map((cells) => {
    const get = (i: number) => (i >= 0 ? (cells[i] ?? '').trim() : '');
    const businessName = get(iBiz);
    const category = get(iCat).toUpperCase();
    const commissionRaw = get(iCom).replace('%', '');
    const commissionPercent = commissionRaw ? Number(commissionRaw) : null;
    const email = get(iEmail) || null;
    let problem: string | null = null;
    if (!businessName) problem = 'missing business name';
    else if (!CATEGORIES.includes(category)) problem = `bad category "${category || '—'}"`;
    else if (commissionPercent != null && (Number.isNaN(commissionPercent) || commissionPercent < 0 || commissionPercent > 50))
      problem = 'commission must be 0–50';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem = 'bad email';
    return {
      businessName,
      website: get(iWeb),
      category,
      commissionPercent,
      contactName: get(iName),
      email,
      phone: get(iPhone) || null,
      problem,
    };
  });
}

export default function BulkImportPage() {
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const rows = useMemo(() => toRows(csvText), [csvText]);
  const valid = rows.filter((r) => !r.problem);

  async function onFile(f: File | null) {
    if (!f) return;
    setCsvText(await f.text());
  }

  async function submit() {
    if (valid.length === 0 || submitting) return;
    setSubmitting(true);
    setApiError(null);
    setResults(null);
    try {
      const res = await fetch('/api/admin/affiliates/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: valid.map((r) => ({
            businessName: r.businessName,
            website: r.website,
            category: r.category,
            commissionPercent: r.commissionPercent,
            contactName: r.contactName,
            email: r.email,
            phone: r.phone,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setApiError(json.error || `HTTP ${res.status}`);
      } else {
        setResults(json.results as RowResult[]);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <div className="mb-6">
        <Link href="/admin/affiliates" className="text-sm text-brand-blue underline">
          ← Affiliates
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Bulk partner import</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Paste CSV or upload a file. Each row becomes a DRAFT affiliate +
          live partner page at <code className="bg-gray-100 px-1 rounded">/partners/&lt;slug&gt;</code>{' '}
          with the logo extracted from the company website (verified to load;
          if no usable logo is found the page shows the business name as an
          all-caps wordmark, so every page is ready to send immediately).
          Activate each partner by sending the welcome email from the
          affiliate detail page.
        </p>
        <p className="text-xs text-gray-500 mt-2 font-mono">
          business_name, website, category, commission_percent, contact_name, email, phone
        </p>
        <p className="text-xs text-gray-500 font-mono">
          category: BARTENDER · BOAT · VENUE · LODGING · PLANNER · OTHER
        </p>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="button"
          onClick={() =>
            setCsvText(
              'business_name,website,category,commission_percent,contact_name,email,phone\nATX Craft Bartending,atxcraftbartending.com,BARTENDER,10,Jamie Smith,jamie@atxcraftbartending.com,5125551000\nLakeside Boat Co,lakesideboats.com,BOAT,12,,,',
            )
          }
          className="text-xs underline text-gray-500"
        >
          Load example
        </button>
      </div>

      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={8}
        placeholder="Paste CSV here (header row first)…"
        className="w-full rounded-lg border-2 border-gray-200 p-3 font-mono text-sm focus:border-brand-blue focus:outline-none"
      />

      {rows.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Website</th>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Commission</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className={r.problem ? 'bg-red-50' : ''}>
                  <td className="p-2 font-medium">{r.businessName || '—'}</td>
                  <td className="p-2 text-gray-600">{r.website || '—'}</td>
                  <td className="p-2">{r.category || '—'}</td>
                  <td className="p-2 text-right">{r.commissionPercent != null ? `${r.commissionPercent}%` : 'default'}</td>
                  <td className="p-2 text-gray-600">{r.email || <span className="text-amber-600">placeholder</span>}</td>
                  <td className="p-2">
                    {r.problem ? (
                      <span className="text-red-700 text-xs font-bold">✗ {r.problem}</span>
                    ) : (
                      <span className="text-green-700 text-xs font-bold">✓ ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={valid.length === 0 || submitting}
          className="btn-primary px-5 py-2.5 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : `Create ${valid.length} partner${valid.length === 1 ? '' : 's'}`}
        </button>
        {rows.length > valid.length && (
          <span className="text-xs text-red-700">
            {rows.length - valid.length} row(s) have problems and will be skipped.
          </span>
        )}
      </div>

      {apiError && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {apiError}
        </div>
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Results — {results.filter((r) => r.ok).length} created,{' '}
            {results.filter((r) => !r.ok).length} failed
          </h2>
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Result</th>
                  <th className="text-left p-2">Partner page</th>
                  <th className="text-left p-2">Referral code</th>
                  <th className="text-left p-2">Logo</th>
                  <th className="text-left p-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={i} className={r.ok ? '' : 'bg-red-50'}>
                    <td className="p-2 font-medium">{r.businessName}</td>
                    <td className="p-2">
                      {r.ok ? (
                        <span className="text-green-700 font-bold text-xs">✓ created (DRAFT)</span>
                      ) : (
                        <span className="text-red-700 text-xs font-bold">✗ {r.error}</span>
                      )}
                    </td>
                    <td className="p-2">
                      {r.partnerUrl ? (
                        <a href={r.partnerUrl} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline text-xs">
                          {r.partnerUrl.replace('https://', '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="p-2 font-mono text-xs">{r.code ?? '—'}</td>
                    <td className="p-2 text-xs">
                      {!r.ok ? (
                        '—'
                      ) : r.logoUrl ? (
                        <a href={r.logoUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
                          found
                        </a>
                      ) : (
                        <span className="text-gray-600">name wordmark</span>
                      )}
                    </td>
                    <td className="p-2 text-xs text-amber-700">
                      {r.placeholderEmail ? 'placeholder email — set the real one before activating' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
