'use client';

/**
 * Research-queue banner: how much session work is waiting (research
 * PENDING / enriched-awaiting-draft / redo-requested) and the exact
 * command Allan runs to work the queue. AI research happens in Claude
 * Code sessions on the subscription — never in the app.
 */

import { useState, type ReactElement } from 'react';
import type { ProspectMetrics } from './ProspectsMetricsStrip';

export default function ResearchQueueBanner({
  metrics,
}: {
  metrics: ProspectMetrics | null;
}): ReactElement | null {
  const [copied, setCopied] = useState<string | null>(null);
  if (!metrics) return null;
  const { researchPending, awaitingDraft, redoRequested } = metrics.queue;
  if (researchPending + awaitingDraft + redoRequested === 0) return null;

  const command =
    redoRequested > 0 || awaitingDraft > 0
      ? 'claude "/partner-prospecting draft enriched prospects"'
      : 'claude "/partner-prospecting enrich pending prospects"';

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(command);
    setCopied(command);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex flex-wrap items-center gap-3">
      <div className="text-sm text-amber-900">
        <span className="font-bold">Research queue:</span>{' '}
        {researchPending > 0 && <span>{researchPending} awaiting enrichment · </span>}
        {awaitingDraft > 0 && <span>{awaitingDraft} enriched awaiting drafts · </span>}
        {redoRequested > 0 && <span>{redoRequested} re-draft requested · </span>}
        run in a Claude Code session:
      </div>
      <code className="text-sm bg-white border border-amber-200 rounded px-2 py-1 text-gray-800">
        {command}
      </code>
      <button type="button" onClick={copy} className="btn-ghost px-3 py-1.5">
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}
