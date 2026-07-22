'use client';

import { ReactElement, useMemo, useState } from 'react';
import { REPLY_TEMPLATES } from '@/lib/leads/reply-templates.generated';
import {
  applyTemplate,
  greetingFor,
  inboundReplySubject,
  orderTemplatesForLead,
  quoteInboundMessage,
  unfilledTokens,
  type ReplyTemplate,
} from '@/lib/leads/reply-templates';

/** The latest inbound email on the lead, when it's an Inbound Email card. */
export interface InboundContext {
  subject: string | null;
  bodyText: string | null;
  snippet: string | null;
  receivedAt: string;
  fromName: string | null;
  fromEmail: string | null;
}

/**
 * 1:1 email composer on the lead card. Sends via the reply route (Resend,
 * from/reply-to info@); success logs to the timeline and auto-moves NEW →
 * Contacted, so the parent reloads on send.
 *
 * Quick-fill templates come straight from the playbook (Allan's voice, via
 * reply-templates.generated.ts). The composer fills `{{first_name}}` from the
 * lead and leaves other `{{tokens}}` (e.g. the cart link) for the operator —
 * warning before a send that still contains one. Inbound-Email leads default to
 * an `Re:` subject and can quote the customer's message beneath the reply.
 */
export default function ReplyComposer({
  leadId,
  leadEmail,
  firstName,
  sourceWidget,
  occasion,
  inbound,
  fallbackSubject = 'Your Party On Delivery inquiry',
  onSent,
}: {
  leadId: string;
  leadEmail: string | null;
  firstName?: string | null;
  sourceWidget?: string | null;
  occasion?: string | null;
  inbound?: InboundContext | null;
  fallbackSubject?: string;
  onSent: () => void;
}): ReactElement {
  const [subject, setSubject] = useState(
    inbound ? inboundReplySubject(inbound.subject) : fallbackSubject,
  );
  const [body, setBody] = useState(() => greetingFor(firstName));
  const [quoteOriginal, setQuoteOriginal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);

  const templates = useMemo(
    () => orderTemplatesForLead(REPLY_TEMPLATES, { sourceWidget, occasion }),
    [sourceWidget, occasion],
  );

  if (!leadEmail) {
    return (
      <p className="text-sm text-gray-400">
        No email on this lead — text them via GHL instead.
      </p>
    );
  }

  const applyTpl = (tpl: ReplyTemplate): void => {
    const pristine = greetingFor(firstName).trim();
    if (body.trim() && body.trim() !== pristine && !window.confirm('Replace your current draft?')) {
      return;
    }
    const filled = applyTemplate(tpl, { firstName });
    setSubject(filled.subject);
    setBody(filled.body);
    setSentAt(null);
  };

  const send = async (): Promise<void> => {
    if (!subject.trim() || !body.trim() || sending) return;
    const pending = unfilledTokens(`${subject}\n${body}`);
    if (
      pending.length > 0 &&
      !window.confirm(
        `This still has placeholder(s): ${pending.map((t) => `{{${t}}}`).join(', ')}. Send anyway?`,
      )
    ) {
      return;
    }
    const finalBody =
      quoteOriginal && inbound ? `${body.trim()}\n\n${quoteInboundMessage(inbound)}` : body.trim();
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/leads/${leadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: finalBody }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        setBody('');
        setSentAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        onSent();
      } else if (payload?.error === 'recipient_suppressed') {
        setError('This address unsubscribed — email is blocked. Use GHL/phone instead.');
      } else if (payload?.error === 'lead_has_no_email') {
        setError('No email on this lead.');
      } else {
        setError('Send failed — try again.');
      }
    } catch {
      setError('Send failed — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Quick-fill templates in Allan's voice (generated from the playbook). */}
      <div className="flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTpl(t)}
            className="min-h-[32px] px-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:border-brand-blue hover:text-brand-blue transition-colors"
            title={`Insert the "${t.label}" reply`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={200}
        placeholder="Subject"
        className="w-full rounded-lg border border-gray-300 p-2 text-base"
        aria-label="Email subject"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        maxLength={10_000}
        placeholder={`Reply to ${leadEmail} — sends from info@partyondelivery.com`}
        className="w-full rounded-lg border border-gray-300 p-2 text-base"
        aria-label="Email body"
      />

      {inbound && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={quoteOriginal}
            onChange={(e) => setQuoteOriginal(e.target.checked)}
            className="accent-brand-blue w-4 h-4"
          />
          Quote their message below my reply
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {sentAt && !error && <p className="text-sm text-green-700">Sent at {sentAt}.</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !subject.trim() || !body.trim()}
          className="btn-primary min-h-[40px] px-4 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send email'}
        </button>
      </div>
    </div>
  );
}
