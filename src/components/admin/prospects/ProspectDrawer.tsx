'use client';

/**
 * Full-detail drawer for one prospect: contact + email edit + verify /
 * catch-all override, the dossier (ProspectEnrichmentPanel), the 3-touch
 * draft editor, approve toggle, test-send, and single enroll.
 */

import { useState, type ReactElement } from 'react';
import ProspectEnrichmentPanel from '@/components/admin/ProspectEnrichmentPanel';
import ProspectStatusChip from './ProspectStatusChip';
import ProspectDraftEditor from './ProspectDraftEditor';
import type { ProspectActionApi } from './useProspectActions';
import {
  isEmailVerified,
  ARM_CHIP,
  type LeadState,
  type ProspectRow,
  type VerticalUiConfig,
} from './types';

export default function ProspectDrawer({
  prospect,
  state,
  config,
  actions,
  onVerified,
  onClose,
}: {
  prospect: ProspectRow;
  state?: LeadState;
  config: VerticalUiConfig;
  actions: ProspectActionApi;
  onVerified: () => Promise<void>;
  onClose: () => void;
}): ReactElement {
  const [emailDraft, setEmailDraft] = useState(prospect.email ?? '');
  const [verifying, setVerifying] = useState(false);
  const saving = actions.busy !== null;

  const verifyNow = async (): Promise<void> => {
    setVerifying(true);
    await actions.verifyOne(prospect.id);
    await onVerified();
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-gray-900/40"
      />
      <div className="w-full max-w-3xl h-full overflow-y-auto bg-gray-50 shadow-xl p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-heading font-bold tracking-[0.1em] text-gray-900">
              {prospect.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
              <ProspectStatusChip prospect={prospect} state={state} />
              {prospect.abArm && ARM_CHIP[prospect.abArm] && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${ARM_CHIP[prospect.abArm].cls}`}
                  title="A/B first-touch test arm — the email version this prospect will send"
                >
                  {ARM_CHIP[prospect.abArm].label}
                </span>
              )}
              {prospect.website && (
                <a
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue underline break-all"
                >
                  {prospect.website.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              )}
              {prospect.phone && <span>{prospect.phone}</span>}
              {prospect.contactName && <span>· {prospect.contactName}</span>}
            </div>
            {(prospect.researchError || prospect.draftError) && (
              <p className="mt-1 text-sm text-red-700">
                {prospect.researchError && <>Research failed: {prospect.researchError} </>}
                {prospect.draftError && <>Draft failed: {prospect.draftError}</>}
              </p>
            )}
            {prospect.draftRedoGuidance && (
              <p className="mt-1 text-sm text-amber-800">
                Re-draft queued: “{prospect.draftRedoGuidance}”
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3 py-2">
            Close
          </button>
        </div>

        {/* Email + verification */}
        <div className="card space-y-2">
          <h3 className="text-lg font-bold text-gray-900">Email &amp; deliverability</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="direct@company.com"
              className="input-premium flex-1 min-w-[240px]"
            />
            <button
              type="button"
              onClick={() => void actions.patch(prospect.id, { email: emailDraft || null })}
              disabled={saving || emailDraft === (prospect.email ?? '')}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              Save email (resets verification)
            </button>
            <button
              type="button"
              onClick={() => void verifyNow()}
              disabled={saving || verifying || !prospect.email}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Status: <span className="font-semibold">{prospect.emailVerifyStatus}</span>
            {prospect.emailVerifiedAt && <> · checked {prospect.emailVerifiedAt.slice(0, 10)}</>}
            {isEmailVerified(prospect) && <> · sendable</>}
          </p>
          {(prospect.emailVerifyStatus === 'CATCH_ALL' ||
            prospect.emailVerifyStatus === 'ROLE') && (
            <button
              type="button"
              onClick={() => void actions.patch(prospect.id, { action: 'toggle-verify-override' })}
              disabled={saving}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              {prospect.emailVerifyOverride
                ? prospect.emailVerifyStatus === 'ROLE'
                  ? 'Remove role-address override'
                  : 'Remove catch-all override'
                : prospect.emailVerifyStatus === 'ROLE'
                  ? 'Accept role address for sending'
                  : 'Accept catch-all for sending'}
            </button>
          )}
          {prospect.emailVerifyStatus === 'ROLE' && !prospect.emailVerifyOverride && (
            <p className="text-sm text-amber-800">
              Role address (info@/hello@/reservations@) — often the address the business
              publishes for exactly this, and at a small operator it is the owner&apos;s inbox.
              Accept it to send, or edit to a direct person. Use a non-personal greeting when
              sending to a shared inbox.
            </p>
          )}
        </div>

        {/* Dossier */}
        {prospect.enrichment ? (
          <ProspectEnrichmentPanel
            name={prospect.name}
            enrichment={prospect.enrichment}
            labels={config.portfolioLabels}
          />
        ) : (
          <p className="text-sm text-gray-600">
            Not enriched yet — run <code>claude &quot;/partner-prospecting enrich&quot;</code>.
          </p>
        )}

        {/* Draft */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">Outreach draft (3 touches)</h3>
              {prospect.abArm && ARM_CHIP[prospect.abArm] && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${ARM_CHIP[prospect.abArm].cls}`}
                  title="A/B first-touch test arm — this prospect only ever sends this arm's copy"
                >
                  {ARM_CHIP[prospect.abArm].label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Status: {prospect.draftStatus}</span>
              <button
                type="button"
                onClick={() =>
                  void actions.patch(prospect.id, {
                    action: prospect.draftStatus === 'APPROVED' ? 'unapprove' : 'approve',
                  })
                }
                disabled={
                  saving ||
                  !prospect.draftSubject ||
                  !prospect.draftBody ||
                  (prospect.draftStatus !== 'DRAFTED' && prospect.draftStatus !== 'APPROVED')
                }
                className={`px-4 py-2 text-sm rounded-lg font-semibold tracking-[0.08em] disabled:opacity-50 ${
                  prospect.draftStatus === 'APPROVED'
                    ? 'bg-white text-brand-blue border-2 border-brand-blue'
                    : 'bg-brand-blue text-white'
                }`}
              >
                {prospect.draftStatus === 'APPROVED' ? 'Un-approve' : 'Approve for sending'}
              </button>
            </div>
          </div>
          <ProspectDraftEditor
            key={`${prospect.id}:${prospect.draftStatus}:${prospect.draftSubject ?? ''}`}
            prospect={prospect}
            saving={saving}
            onSave={async (draft) => {
              await actions.patch(prospect.id, { draft });
            }}
            onRequestRedraft={async (guidance) => {
              await actions.patch(prospect.id, {
                action: 'request-redraft',
                ...(guidance.trim() ? { guidance: guidance.trim() } : {}),
              });
            }}
          />
        </div>

        {/* Variant B — Brian's original enrichment-based personalized email,
            preserved verbatim from the legacy prospect JSONs (read-only). */}
        {prospect.draftBSubject && prospect.draftBBody && (
          <div className="card space-y-2">
            <h3 className="text-lg font-bold text-gray-900">
              Variant B — original personalized email
            </h3>
            <p className="text-sm text-gray-600">
              The enrichment-based draft written before the 3-touch redraft
              {prospect.draftBSource === 'legacy-manual-json' && ' (restored from the prospect files)'}
              . Reference copy — the campaign sends the draft above.
            </p>
            <p className="text-sm text-gray-900">
              <span className="font-semibold">Subject:</span> {prospect.draftBSubject}
            </p>
            <pre className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3 font-sans">
              {prospect.draftBBody}
            </pre>
          </div>
        )}

        {/* Send actions */}
        <div className="flex flex-wrap items-center gap-3 pb-8">
          <button
            type="button"
            onClick={() => void actions.testSend(prospect.website)}
            disabled={saving || !prospect.draftSubject || !prospect.draftBody}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            {actions.busy === `test:${prospect.website}` ? 'Sending…' : 'Test-send → info@'}
          </button>
          <button
            type="button"
            onClick={() => void actions.enroll([prospect.website])}
            disabled={saving || !prospect.email || !state || state.campaign !== 'none'}
            className="btn-cart px-4 py-2 text-sm disabled:opacity-50"
          >
            Enroll in campaign
          </button>
        </div>
      </div>
    </div>
  );
}
