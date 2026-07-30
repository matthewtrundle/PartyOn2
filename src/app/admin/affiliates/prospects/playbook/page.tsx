import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';

export const metadata: Metadata = {
  title: 'Outreach Playbook — Partners',
  robots: { index: false, follow: false },
};

/**
 * Partners hub → Outreach Playbook.
 *
 * The Partner Outreach 2.0 reference: city/vertical prospecting → session
 * research → Hormozi 3-touch drafts → ZeroBounce verification → operator
 * approval → capped sends → replies on the Leads board. Kept current as
 * the system evolves.
 */

function H2({ children }: { children: React.ReactNode }): ReactElement {
  return <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">{children}</h2>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </div>
  );
}

export default function OutreachPlaybookPage(): ReactElement {
  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="playbook" />
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Partner Outreach Playbook</h1>
        <p className="text-sm text-gray-600 mt-2">
          Pick city + vertical → discover prospects → deep research per prospect → personalized
          3-touch draft → verify the email won&apos;t bounce → review/approve in the workbench →
          ~10 sends/day from info@ → replies land on the Leads board. Quality over quantity:
          the daily cap is deliberate.
        </p>

        <H2>The pipeline</H2>
        <Card title="1 · Prospects live in the database (not JSON, not a deploy)">
          <p>
            One <code>partner_prospects</code> row per company, deduped by website. Verticals:
            STR, Bartending, BYOB Venues — each has its own tab. New prospects arrive from
            discovery sessions or manual adds; nothing requires a code change. The status chip
            (Sourced → Enriched → Drafted → Verified → Approved → Enrolled → Sent → Replied)
            is derived live from the row — there is no status to maintain by hand.
          </p>
        </Card>
        <Card title="2 · Research runs in Claude Code sessions (never in the app)">
          <p>
            The amber banner shows the queue (awaiting enrichment / awaiting drafts / re-draft
            requests) and the exact command to run. A session web-researches each prospect
            into a dossier — management, portfolio, reputation, partnership angles, direct
            contact info, and 3–5 <strong>source-cited hooks</strong> — then imports it with a
            vetted script (dry-run first; the whole batch is rejected if anything looks
            wrong). Hooks must cite the page they were read on; the session spot-checks them
            against the live pages before importing.
          </p>
        </Card>
        <Card title="3 · Drafts follow the Hormozi rules (linted, never auto-approved)">
          <ul className="list-disc pl-5 space-y-1">
            <li>Brian&apos;s voice, 60–110-word body, plain text.</li>
            <li>Exactly ONE hook from the dossier, woven naturally — never embellished.</li>
            <li>One offer sentence per vertical (guest perk / supply chain / BYOB selling point).</li>
            <li>
              Binary CTA — &ldquo;want me to send it over?&rdquo; — <strong>never</strong> a
              meeting ask. Exactly one question mark.
            </li>
            <li>Lowercase 1–3-word subject + a distinct alternate subject (see cadence below).</li>
            <li>No signature in the body — the sender appends Brian&apos;s signature + footer.</li>
          </ul>
          <p>
            The draft editor shows live word counts and lint badges. Imported drafts land as
            DRAFTED; a human approves every email before it can send. Editing an approved
            draft un-approves it, and &ldquo;Request re-draft&rdquo; queues it (with your
            guidance note) for the next drafting session.
          </p>
        </Card>
        <Card title="4 · Verification gates the send (ZeroBounce)">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Verified</strong> — sendable.</li>
            <li>
              <strong>Catch-all</strong> — sendable. The server accepts any address, so
              ZeroBounce cannot confirm the mailbox, but nothing hard-bounces.
            </li>
            <li>
              <strong>Role addr</strong> (info@/hello@/reservations@) — sendable. It is
              usually the address the business publishes for inbound contact.
            </li>
            <li><strong>Invalid</strong> — never sends (no mailbox = hard bounce).</li>
          </ul>
          <p>
            Editing an email resets its verification. A vendor outage never flips an address
            to sendable (fail-closed).
          </p>
        </Card>
        <Card title="5 · The 3-touch cadence (day 0 / +5 / +12) with open-branching">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Touch 1</strong> (day 0): the approved personalized email.</li>
            <li>
              <strong>Touch 2</strong> (+5 days): if touch 1 shows <em>no open</em>, the SAME
              email resends under the alternate subject as a fresh thread; if it was opened
              but unanswered, the substantive bump goes out instead.
            </li>
            <li>
              <strong>Touch 3</strong> (+12 days): a standalone ≤120-word soft close that makes
              &ldquo;no&rdquo; easy.
            </li>
          </ul>
          <p>
            Opens are directional (Apple Mail privacy inflates them, image-blocking hides
            them) — both branches are safe to receive. A reply, bounce, or unsubscribe
            cancels everything instantly; so does closing the lead as Won/Lost on the board,
            the partner signing (partner-active), or un-approving the draft.
          </p>
        </Card>
        <Card title="6 · The daily cap">
          <p>
            At most <code>OUTREACH_DAILY_CAP</code> (default 10) partner-outreach emails per
            Central-time day, counting ALL touches. Over-cap jobs simply wait for the next
            day — nothing is lost, nothing retries harder. Sends go out inside the 9am–7pm CT
            window with jitter.
          </p>
        </Card>
        <Card title="7 · Replies land on the Leads board">
          <p>
            Replies to info@ are ingested to <code>/admin/leads</code> with hot-lead alerts.
            A replied prospect&apos;s remaining touches cancel automatically — a human owns
            the thread from there. Partner pages + affiliate commissions work exactly as
            before: sign the partner, tag flips to Active Partner on the next sync.
          </p>
        </Card>

        <H2>Enroll gates (why a checkbox is disabled)</H2>
        <Card title="Every enrollment requires ALL of:">
          <ul className="list-disc pl-5 space-y-1">
            <li>An email on the row (enrich or edit to add one).</li>
            <li>A synced Lead (run Sync to CRM).</li>
            <li>An APPROVED draft.</li>
            <li>A verified email that is not Invalid.</li>
            <li>Not suppressed, not already in a campaign.</li>
          </ul>
        </Card>

        <H2>Going live / staying safe</H2>
        <Card title="Flag-flip procedure (unchanged: Brian flips the switch)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Test-send 3 prospects to info@ and eyeball all 3 touches + signature.</li>
            <li>
              Run <code>npx tsx scripts/audit-outreach-jobs.ts</code> — every scheduled job
              must map to an APPROVED, verified prospect.
            </li>
            <li>Enroll a small batch — jobs schedule but hold while flags are off.</li>
            <li>
              Brian flips <code>followups_master</code> + <code>followups_partner_outreach</code>{' '}
              in the flags admin.
            </li>
            <li>
              Watch day 1: ≤10 sends in-window, delivery statuses in the metrics strip, one
              reply cancels its remaining touches, one bounce suppresses the address.
            </li>
          </ol>
        </Card>
        <Card title="Week-1 stop gates">
          <p>
            Bounce rate &lt; 2% and complaint rate &lt; 0.1%. If either trips: STOP (flip the
            journey flag off) and audit list quality before resuming. Deliverability on the
            main domain is the asset being protected.
          </p>
        </Card>

        <H2>Where things live</H2>
        <Card title="Key files">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Data: <code>partner_prospects</code> via{' '}
              <code>src/lib/partners/prospect-store.ts</code> (seeded by{' '}
              <code>scripts/seed-partner-prospects.ts</code>).
            </li>
            <li>
              Research contracts: <code>src/lib/outreach/</code> (schemas, verticals,
              draft-prompt, draft-lint) + <code>scripts/import-prospect-*.ts</code> +{' '}
              <code>scripts/import-discovered-prospects.ts</code>.
            </li>
            <li>
              Session procedures: <code>.claude/skills/partner-prospecting/SKILL.md</code>.
            </li>
            <li>
              Send engine + cap: <code>src/lib/followups/</code> (journeys, engine,
              outreach-cap).
            </li>
            <li>
              APIs (ops-gated): <code>/api/v1/admin/partner-prospects/*</code>.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
