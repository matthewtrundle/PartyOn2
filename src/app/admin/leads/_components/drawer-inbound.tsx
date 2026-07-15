'use client';

import { ReactElement } from 'react';
import type { LeadDetail } from './drawer-types';

/** "Mon D, h:mm AM" in CT — the business runs on Central time. */
function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  });
}

/**
 * "Messages from them" — the actual inbound emails a customer sent to info@,
 * so an operator can read what they wrote before replying (the composer sits
 * right below). Newest first; long bodies scroll inside their own card.
 * Renders nothing when there's no inbound mail.
 */
export default function DrawerInbound({
  inboundEmails,
}: {
  inboundEmails: LeadDetail['inboundEmails'];
}): ReactElement | null {
  if (inboundEmails.length === 0) return null;
  return (
    <section className="mt-4">
      <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
        Messages from them
      </h3>
      <ul className="mt-2 space-y-3">
        {inboundEmails.map((m) => (
          <li key={m.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-sm text-gray-900 break-words">
                {m.subject || '(no subject)'}
              </span>
              <span className="shrink-0 text-sm text-gray-400">{fmtWhen(m.receivedAt)}</span>
            </div>
            {m.bodyText ? (
              <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm text-gray-700">
                {m.bodyText}
              </p>
            ) : m.snippet ? (
              <p className="mt-1 break-words text-sm text-gray-600">{m.snippet}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
