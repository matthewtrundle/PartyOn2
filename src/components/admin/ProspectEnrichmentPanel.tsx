'use client';

/**
 * Expanded prospect dropdown: the deep-researched profile + personalized
 * outreach draft. Split from PartnerProspectsView to keep both files
 * within the component-size budget.
 */

import type { ReactElement } from 'react';
import type { Prospect, ProspectViewConfig } from '@/components/admin/PartnerProspectsView';

export default function ProspectEnrichmentPanel({
  prospect,
  labels,
  onCopyEmail,
  emailCopied,
}: {
  prospect: Prospect;
  labels: ProspectViewConfig['portfolioLabels'];
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
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">{labels.heading}</h4>
          <dl className="text-sm text-gray-700 space-y-1">
            <div><span className="font-semibold">{labels.count}:</span> {e.portfolio.propertyCount}</div>
            <div><span className="font-semibold">{labels.types}:</span> {e.portfolio.propertyTypes}</div>
            <div><span className="font-semibold">{labels.locations}:</span> {e.portfolio.locations}</div>
            {e.portfolio.maxGroupSize && (
              <div><span className="font-semibold">{labels.maxGroupSize}:</span> {e.portfolio.maxGroupSize}</div>
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
            <div><span className="font-semibold">Model:</span> {e.business.bookingModel}</div>
            <div><span className="font-semibold">Services:</span> {e.business.services}</div>
            <div><span className="font-semibold">Positioning:</span> {e.business.positioning}</div>
            <div><span className="font-semibold">Clients:</span> {e.business.guestDemographic}</div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Reputation</h4>
          <p className="text-sm text-gray-700">{e.reputation.summary}</p>
          {e.reputation.ratings && <p className="text-sm text-gray-600 mt-1">{e.reputation.ratings}</p>}
          {e.reputation.praiseThemes && (
            <p className="text-sm text-gray-600 mt-1"><span className="font-semibold text-gray-800">Clients praise:</span> {e.reputation.praiseThemes}</p>
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
