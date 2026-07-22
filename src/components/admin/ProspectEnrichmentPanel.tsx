'use client';

/**
 * Prospect dossier renderer (management / portfolio / business / reputation
 * / partnership angles, plus the 2.0 additions: source-cited hooks, sources,
 * siteAccess). Tolerant of partially-filled dossiers — legacy enrichment
 * lacks the new sections. Drafts are NOT rendered here — they live in the
 * drawer's ProspectDraftEditor.
 */

import type { ReactElement } from 'react';
import type { ProspectEnrichment } from '@/lib/partners/prospect-store';
import type { VerticalUiConfig } from '@/components/admin/prospects/types';

type Dict = Record<string, unknown>;
const dict = (v: unknown): Dict | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Dict) : null;
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

function Card({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }): ReactElement | null {
  if (!value) return null;
  return (
    <div>
      <span className="font-semibold">{label}:</span> {value}
    </div>
  );
}

export default function ProspectEnrichmentPanel({
  name,
  enrichment,
  labels,
}: {
  name: string;
  enrichment: ProspectEnrichment;
  labels: VerticalUiConfig['portfolioLabels'];
}): ReactElement {
  const management = dict(enrichment.management);
  const portfolio = dict(enrichment.portfolio);
  const business = dict(enrichment.business);
  const reputation = dict(enrichment.reputation);
  const angles = Array.isArray(enrichment.partnershipAngles)
    ? (enrichment.partnershipAngles as unknown[]).filter((a): a is string => typeof a === 'string')
    : [];
  const hooks = Array.isArray(enrichment.hooks) ? (enrichment.hooks as Dict[]) : [];
  const sources = Array.isArray(enrichment.sources)
    ? (enrichment.sources as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const notable = portfolio && Array.isArray(portfolio.notableProperties)
    ? (portfolio.notableProperties as Dict[])
    : [];

  return (
    <div className="max-w-5xl">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-lg font-bold text-gray-900">Enriched profile — {name}</h3>
        <span className="text-sm text-gray-500">
          {str(enrichment.siteAccess) === 'blocked' && (
            <span className="mr-2 text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
              site blocked fetching
            </span>
          )}
          {str(enrichment.enrichedAt) && <>researched {str(enrichment.enrichedAt)}</>}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {management && (
          <Card title="Management">
            <dl className="text-sm text-gray-700 space-y-1">
              <Field label="Owner" value={str(management.ownerName)} />
              {str(management.ownerNotes) && (
                <div className="text-gray-600">{str(management.ownerNotes)}</div>
              )}
              <Field label="Team" value={str(management.team)} />
              <Field label="Operating since" value={str(management.operatingSince)} />
              <Field label="Entity" value={str(management.entity)} />
              {str(management.linkedin)?.startsWith('http') && (
                <div>
                  <a
                    href={str(management.linkedin)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
            </dl>
          </Card>
        )}
        {portfolio && (
          <Card title={labels.heading}>
            <dl className="text-sm text-gray-700 space-y-1">
              <Field label={labels.count} value={str(portfolio.propertyCount)} />
              <Field label={labels.types} value={str(portfolio.propertyTypes)} />
              <Field label={labels.locations} value={str(portfolio.locations)} />
              <Field label={labels.maxGroupSize} value={str(portfolio.maxGroupSize)} />
            </dl>
            {notable.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-0.5">
                {notable.map((np, i) => (
                  <li key={i}>
                    <span className="font-medium text-gray-800">{str(np.name)}</span> — {str(np.blurb)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {business && (
          <Card title="Business">
            <dl className="text-sm text-gray-700 space-y-1">
              <Field label="Model" value={str(business.bookingModel)} />
              <Field label="Services" value={str(business.services)} />
              <Field label="Positioning" value={str(business.positioning)} />
              <Field label="Clients" value={str(business.guestDemographic)} />
            </dl>
          </Card>
        )}
        {reputation && (
          <Card title="Reputation">
            <p className="text-sm text-gray-700">{str(reputation.summary)}</p>
            {str(reputation.ratings) && (
              <p className="text-sm text-gray-600 mt-1">{str(reputation.ratings)}</p>
            )}
            {str(reputation.praiseThemes) && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold text-gray-800">Clients praise:</span>{' '}
                {str(reputation.praiseThemes)}
              </p>
            )}
          </Card>
        )}
      </div>

      {angles.length > 0 && (
        <div className="mb-4">
          <Card title="Partnership angles">
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
              {angles.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {hooks.length > 0 && (
        <div className="mb-4">
          <Card title="Personalization hooks (source-cited)">
            <ul className="text-sm text-gray-700 space-y-1.5">
              {hooks.map((h, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2">
                  <span>{str(h.text)}</span>
                  {str(h.sourceUrl)?.startsWith('http') && (
                    <a
                      href={str(h.sourceUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-blue underline"
                    >
                      source ({str(h.kind) ?? 'link'})
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {sources.length > 0 && (
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold">Sources ({sources.length})</summary>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 break-all">
            {sources.map((s) => (
              <li key={s}>
                {s.startsWith('http') ? (
                  <a href={s} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">
                    {s}
                  </a>
                ) : (
                  s
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
