/**
 * Lead Flow board — 1:1 reply email wrapper.
 *
 * Deliberately personal-looking: plain paragraphs, a human signature, no
 * marketing chrome. Staff type the body in the board's composer; everything
 * lead-derived or staff-typed is HTML-escaped (the body is trusted staff
 * input, but escaping keeps a pasted "<" from breaking rendering, and the
 * subject is newline-stripped so headers can't be injected).
 *
 * A 1:1 human reply is relationship/transactional content, but we keep the
 * physical-address line anyway (it reads like a normal business signature).
 */

export const LEAD_REPLY_POSTAL_ADDRESS = '7600 N Lamar #A2, Austin, TX 78752';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip CR/LF so a subject can never smuggle extra headers. */
export function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

export interface LeadReplyEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildLeadReplyEmail(opts: {
  subject: string;
  body: string;
  senderName: string;
}): LeadReplyEmail {
  const subject = sanitizeSubject(opts.subject);
  const signature = `${opts.senderName}\nParty On Delivery\n(512) 660-6025 · partyondelivery.com`;
  const text = `${opts.body}\n\n${signature}\n\nParty On Delivery · ${LEAD_REPLY_POSTAL_ADDRESS}`;

  const paragraphs = `${opts.body}\n\n${signature}`
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`,
    )
    .join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:600px;">
${paragraphs}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Party On Delivery · ${escapeHtml(
    LEAD_REPLY_POSTAL_ADDRESS,
  )}</p>
</div>`;

  return { subject, html, text };
}
