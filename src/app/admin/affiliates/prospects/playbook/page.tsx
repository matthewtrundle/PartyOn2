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
 * The full partner-prospect outreach system reference (the approved build
 * plan, kept current as the system evolves): how prospects become tagged
 * CRM contacts, how the 2-touch campaign works, the partner-page
 * replication template, and the send rules Brian set.
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
          How the partner-prospect system works end to end: prospect databases → tagged CRM
          contacts → partner pages → 2-touch email campaign → replies on the Leads board.
          This is the reference for the system that is now LIVE — kept current as it evolves.
        </p>

        <H2>The pipeline at a glance</H2>
        <Card title="1 · Prospect databases (STR + Bartending tabs)">
          <p>
            Researched Austin companies with contact info, socials, scraped logos, and a full
            enrichment per row (management, offering, reputation, partnership angles, and a
            personalized outreach email). Every row is searchable; the enrichment opens as a
            dropdown under the company.
          </p>
        </Card>
        <Card title="2 · Sync to CRM — tagged contacts, separated from consumers">
          <p>
            The <strong>Sync to CRM</strong> button upserts every company as a Lead:{' '}
            <code>partner-prospect</code> + vertical tag (<code>str</code> /{' '}
            <code>bartender</code>), source <code>PARTNER_OUTREACH</code>. Companies whose
            affiliate is ACTIVE also get <code>partner-active</code> — re-running sync keeps
            that current, which is how a prospect flips to Active Partner after signing.
            Every upsert is mirrored to the external CRM (CoreLinq) with its tags.
          </p>
          <p>
            On the Leads board, the source filter has <strong>Partner Prospects</strong> and{' '}
            <strong>Consumers only</strong> options, and partner leads wear a 🤝 badge —
            partner outreach never mixes into the consumer pipeline.
          </p>
        </Card>
        <Card title="3 · Partner page + affiliate (commission-ready)">
          <p>
            Each partner is a normal POD affiliate: referral code, matching free-delivery
            discount, commission through the standard engine, portal login, and a live page
            at <code>/partners/&lt;slug&gt;</code>. Client dashboards created from their page
            attribute to them automatically and appear in their portal + our admin rosters.
          </p>
          <p>
            <strong>Page template:</strong> the Lynn&apos;s Lodging layout is THE replication
            template — two tabs: <em>Alcohol Delivery</em> (the standard POD partner page)
            and <em>Party Boat Rentals</em> (the exact Premier Party Cruises quote page with
            the working Xola Book Now slide-out, served same-origin). STR partner pages
            inherit this automatically once their slug is in the prospect database. Model
            page with placeholder name: <code>/partners/partner-template</code>.
          </p>
        </Card>
        <Card title="4 · The 2-touch campaign (partner-outreach journey)">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Touch 1 (immediately on enroll):</strong> the prospect&apos;s
              personalized enrichment email, looked up fresh at send time — copy edits in
              the database ship without re-enrolling.
            </li>
            <li>
              <strong>Touch 2 (+48h):</strong> abridged follow-up (tokens{' '}
              <code>{'{firstName}'}</code>, <code>{'{company}'}</code>,{' '}
              <code>{'{partnerUrl}'}</code>) — short recap + one CTA. Editable in the
              follow-ups copy panel without a deploy.
            </li>
            <li>
              <strong>Auto-cancel:</strong> the follow-up dies the moment they reply
              (inbound email captured), the lead is marked Won/Lost, they become an active
              partner, or they unsubscribe.
            </li>
            <li>
              <strong>Sender:</strong> info@partyondelivery.com (&quot;Brian at Party On
              Delivery&quot;) — replies flow through the Gmail poller onto the Leads board.
            </li>
            <li>
              Business-hours send window (9am–7pm CT), jittered sends, suppression list +
              CAN-SPAM footer on every touch — all inherited from the follow-up engine.
            </li>
          </ul>
        </Card>
        <Card title="5 · Tracking">
          <p>
            Campaign chips on each prospect row (Enrolled / Sent / Replied), queue + sent
            log in <code>/admin/emails/followups</code>, replies and pipeline stage on{' '}
            <code>/admin/leads</code>, and per-partner dashboards/engagement in the Partners
            section.
          </p>
        </Card>

        <H2>Send rules (Brian&apos;s constraints — enforced in code)</H2>
        <Card title="Nothing sends until explicitly approved">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              The <code>partner-outreach</code> feature flag is <strong>OFF by default</strong>.
              Enrolling queues jobs, but the engine will not send until the flag is flipped
              in <code>/admin/emails/followups</code>.
            </li>
            <li>
              <strong>Test first:</strong> every email gets a test send to
              info@partyondelivery.com (the <em>Test → info@</em> button renders both touches
              in one message with a [TEST] subject prefix) before its batch goes out.
            </li>
            <li>
              <strong>Batches of 5–10:</strong> the Enroll button is capped at 10 per batch,
              server-side.
            </li>
            <li>
              Partner pages are built before their outreach email goes out — the email
              references the live page.
            </li>
          </ul>
        </Card>

        <H2>How to run a batch (operator checklist)</H2>
        <Card title="Step by step">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open STR or Bartending Prospects and click <strong>Sync to CRM</strong>.</li>
            <li>
              Confirm the batch&apos;s partner pages exist (Partner page column shows{' '}
              <strong>✓ /partners/…</strong>). If not, use Copy CSV → Bulk Import.
            </li>
            <li>
              For each prospect in the batch: open the enrichment dropdown, review the
              email, click <strong>Test → info@</strong>, and check the inbox copy.
            </li>
            <li>Tick 5–10 checkboxes and click <strong>Enroll selected</strong>.</li>
            <li>
              When ready to go live: flip <code>followups_partner_outreach</code> ON in the
              follow-ups panel. The engine sends touch 1 on the next tick (in window), and
              touch 2 at +48h unless they reply.
            </li>
            <li>
              Watch replies on <code>/admin/leads</code> (Partner Prospects filter) — reply
              handling is manual from there, exactly like consumer leads.
            </li>
          </ol>
        </Card>

        <H2>System internals (for whoever works on this next)</H2>
        <Card title="What it reuses">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Follow-up engine (<code>src/lib/followups/</code>): 2-touch journey registry,
              send window, atomic claim, dedupe keys, suppression — journey key{' '}
              <code>partner-outreach</code>.
            </li>
            <li>
              <code>sendEmailDetailed()</code> — logged sends with Resend tags, EmailLog
              open/bounce tracking, webhook status updates.
            </li>
            <li>
              Lead tags (<code>leads.tags</code>, GIN-indexed) + source{' '}
              <code>PARTNER_OUTREACH</code>; constants in{' '}
              <code>src/lib/leads/partner-tags.ts</code>.
            </li>
            <li>
              Prospect data: <code>src/data/str-partner-prospects.json</code> +{' '}
              <code>bartending-partner-prospects.json</code> — enrichment, emails, slugs.
            </li>
            <li>
              APIs (ops-gated): <code>/api/v1/admin/partner-prospects/</code>
              <code>{'{sync, enroll, test-send}'}</code>.
            </li>
            <li>
              Page template: <code>PartnerPageTabs</code> + the Premier quote mirror at{' '}
              <code>/partners-embed/premier-quote.html</code> (same-origin, assets proxied —
              see <code>rewrites()</code> in next.config).
            </li>
          </ul>
        </Card>
        <Card title="Deliberately deferred">
          <ul className="list-disc pl-5 space-y-1">
            <li>Automated reply sequences beyond 2 touches (2-touch max is a locked decision).</li>
            <li>
              Auto-enrollment — every batch is human-selected and human-approved by design.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
