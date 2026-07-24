'use client';

import { ReactElement } from 'react';
import { extractSubmission } from './drawer-derive';

/**
 * "What they submitted" — the exact fields the lead filled out, pulled from
 * the capture surface in metadata (concierge questionnaire, quote request,
 * contact form, …). The facts grid above shows the scored highlights; this
 * shows the full form so the operator can read the whole request.
 */
export default function DrawerSubmission({
  metadata,
}: {
  metadata: Record<string, unknown> | null;
}): ReactElement | null {
  const submission = extractSubmission(metadata);
  if (!submission) return null;

  return (
    <section className="mt-4">
      <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
        What they submitted
      </h3>
      <p className="mt-0.5 text-xs text-gray-400">{submission.title}</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        {submission.fields.map((f) => (
          <div key={f.label} className="flex gap-3">
            <dt className="w-32 shrink-0 font-semibold uppercase tracking-[0.05em] text-xs text-gray-500 pt-0.5">
              {f.label}
            </dt>
            <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-gray-800">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
