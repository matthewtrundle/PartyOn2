'use client';

import { ReactElement, useState } from 'react';

/**
 * 1:1 email composer on the lead card. Sends via the reply route (Resend,
 * from/reply-to info@); success logs to the timeline and auto-moves NEW →
 * Contacted, so the parent reloads on send.
 */
export default function ReplyComposer({
  leadId,
  leadEmail,
  defaultSubject,
  onSent,
}: {
  leadId: string;
  leadEmail: string | null;
  defaultSubject: string;
  onSent: () => void;
}): ReactElement {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);

  if (!leadEmail) {
    return (
      <p className="text-sm text-gray-400">
        No email on this lead — text them via GHL instead.
      </p>
    );
  }

  const send = async (): Promise<void> => {
    if (!subject.trim() || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/leads/${leadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
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
        rows={5}
        maxLength={10_000}
        placeholder={`Reply to ${leadEmail} — sends from info@partyondelivery.com`}
        className="w-full rounded-lg border border-gray-300 p-2 text-base"
        aria-label="Email body"
      />
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
