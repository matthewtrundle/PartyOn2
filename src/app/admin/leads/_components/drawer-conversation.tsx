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
 * "Wayne chat" — the free-form AI concierge transcripts this lead had, so an
 * operator can read the whole conversation (what they asked, what Wayne said)
 * before replying. Newest conversation first; the transcript scrolls inside
 * its own card. An escalation badge flags refund/complaint/legal/safety chats.
 *
 * IMPORTANT: this content comes from the public, unauthenticated /api/chat
 * endpoint — the visitor typed it, and there's no identity check tying it to
 * the matched lead. Treat it as unverified (a caption reminds the operator).
 * Renders nothing when there are no captured chats.
 */
export default function DrawerConversation({
  chatConversations,
}: {
  chatConversations: LeadDetail['chatConversations'];
}): ReactElement | null {
  if (chatConversations.length === 0) return null;
  return (
    <section className="mt-4">
      <h3 className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-gray-500">
        Wayne chat
      </h3>
      <p className="mt-0.5 text-sm text-gray-400">
        From the public chat widget — visitor-typed and unverified.
      </p>
      <ul className="mt-2 space-y-3">
        {chatConversations.map((c) => {
          const messages = Array.isArray(c.messages)
            ? c.messages.filter(
                (m): m is { role: string; content: string } =>
                  !!m && typeof m === 'object',
              )
            : [];
          return (
            <li key={c.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-sm text-gray-900 break-words">
                  {c.firstPage || 'Wayne chat'}
                  {c.escalated && (
                    <span className="ml-2 inline-block rounded bg-red-100 px-1.5 py-0.5 align-middle text-xs font-bold uppercase tracking-wide text-red-700">
                      {c.escalationReason || 'escalated'}
                    </span>
                  )}
                  {c.contactCapturedAt && (
                    <span className="ml-2 inline-block rounded bg-green-100 px-1.5 py-0.5 align-middle text-xs font-bold uppercase tracking-wide text-green-700">
                      contact captured
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-gray-400">{fmtWhen(c.createdAt)}</span>
              </div>
              {messages.length > 0 ? (
                <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                  {messages.map((m, i) => {
                    const isUser = m.role === 'user';
                    return (
                      <div
                        key={i}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${
                            isUser
                              ? 'bg-brand-blue text-white'
                              : 'border border-gray-200 bg-white text-gray-800'
                          }`}
                        >
                          {typeof m.content === 'string' ? m.content : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">(empty transcript)</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
