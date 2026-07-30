'use client';

/**
 * 3-touch draft editor: subject + alt-subject + body / follow-up / touch-3
 * with live word counts and lint badges (draft-lint runs client-side —
 * same rules the import script enforces). Saving edits un-approves the
 * draft server-side; "Request re-draft" stores guidance for the next
 * drafting session.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { lintDraft, wordCount, type LintIssue } from '@/lib/outreach/draft-lint';
import type { ProspectRow } from './types';

interface DraftFields {
  subject: string;
  altSubject: string;
  body: string;
  followUpBody: string;
  touch3Body: string;
}

function fieldsFrom(p: ProspectRow): DraftFields {
  return {
    subject: p.draftSubject ?? '',
    altSubject: p.draftAltSubject ?? '',
    body: p.draftBody ?? '',
    followUpBody: p.draftFollowUpBody ?? '',
    touch3Body: p.draftTouch3Body ?? '',
  };
}

function IssueBadges({ issues }: { issues: LintIssue[] }): ReactElement | null {
  if (issues.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {issues.map((i, idx) => (
        <span
          key={idx}
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            i.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {i.message}
        </span>
      ))}
    </div>
  );
}

export default function ProspectDraftEditor({
  prospect,
  saving,
  onSave,
  onRequestRedraft,
}: {
  prospect: ProspectRow;
  saving: boolean;
  onSave: (draft: DraftFields) => Promise<void>;
  onRequestRedraft: (guidance: string) => Promise<void>;
}): ReactElement {
  const [fields, setFields] = useState<DraftFields>(() => fieldsFrom(prospect));
  const [guidance, setGuidance] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);

  const issues = useMemo(
    () =>
      fields.subject || fields.body
        ? lintDraft({
            subject: fields.subject,
            altSubject: fields.altSubject || null,
            body: fields.body,
            followUpBody: fields.followUpBody || null,
            touch3Body: fields.touch3Body || null,
          })
        : [],
    [fields]
  );
  const issuesFor = (field: string) => issues.filter((i) => i.field === field);
  const set = (key: keyof DraftFields) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const touches: Array<{ key: keyof DraftFields; label: string; hint: string; rows: number }> = [
    { key: 'body', label: 'Touch 1 — body', hint: '60–110 words, one cited hook, binary CTA', rows: 8 },
    { key: 'followUpBody', label: 'Touch 2 — opened bump (+5d)', hint: '≤120 words, new substance', rows: 5 },
    { key: 'touch3Body', label: 'Touch 3 — close (+12d)', hint: '≤120 words, easy no', rows: 5 },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold text-gray-800">Subject</span>
          <input
            value={fields.subject}
            onChange={(e) => set('subject')(e.target.value)}
            className="input-premium mt-1"
          />
          <IssueBadges issues={issuesFor('subject')} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-800">
            Alt subject <span className="font-normal text-gray-500">(unopened-resend thread)</span>
          </span>
          <input
            value={fields.altSubject}
            onChange={(e) => set('altSubject')(e.target.value)}
            className="input-premium mt-1"
          />
          <IssueBadges issues={issuesFor('altSubject')} />
        </label>
      </div>

      {touches.map(({ key, label, hint, rows }) => (
        <label key={key} className="block">
          <span className="text-sm font-semibold text-gray-800">
            {label}{' '}
            <span className="font-normal text-gray-500">
              ({hint}) · {wordCount(fields[key])} words
            </span>
          </span>
          <textarea
            value={fields[key]}
            onChange={(e) => set(key)(e.target.value)}
            rows={rows}
            className="input-premium mt-1 font-sans"
          />
          <IssueBadges issues={issuesFor(key)} />
        </label>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave(fields)}
          disabled={saving || !fields.subject || !fields.body}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save draft (un-approves)'}
        </button>
        <button
          type="button"
          onClick={() => setShowGuidance((v) => !v)}
          className="btn-secondary px-4 py-2 text-sm"
        >
          Request re-draft
        </button>
      </div>
      {showGuidance && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              Guidance for the next drafting session
            </span>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={2}
              placeholder='e.g. "shorter, lean on the pool-party reviews hook"'
              className="input-premium mt-1"
            />
          </label>
          <button
            type="button"
            onClick={() => void onRequestRedraft(guidance)}
            disabled={saving}
            className="btn-cart px-4 py-2 text-sm disabled:opacity-50"
          >
            Queue re-draft
          </button>
        </div>
      )}
    </div>
  );
}
