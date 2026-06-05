import Link from 'next/link';
import { listDemoEvents } from '@/lib/events/demoEvents';

/**
 * Brian's Stuff → Event Invites tab.
 *
 * Documentation hub + organizer-side mockup for the new party-invite
 * app. Three sections:
 *
 *   1. What this is + how it works (docs)
 *   2. Live demo links (Brian's 41st)
 *   3. Mockup of the "Create event" / "Manage event" organizer UX
 *
 * No database persistence yet — Brian sees the full UX before we wire
 * Prisma + Stripe per-RSVP separate-bill checkout.
 */
export default function EventsView() {
  const events = listDemoEvents();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-md border border-purple-200 bg-purple-50 p-5">
        <h2 className="text-xl font-bold text-purple-900 tracking-wide">
          🎉 Party Invite Creator — Mockup
        </h2>
        <p className="text-sm text-purple-900 mt-2 leading-relaxed">
          Eventbrite / Posh / Partyfly-style event pages, with one big
          differentiator: every invitee can order their own BYOB drinks
          from Party On Delivery, pay on their own card, and have it
          delivered to the venue with their name on the box.
        </p>
        <p className="text-xs text-purple-700 mt-2 italic">
          This tab is the documentation + organizer-side mockup. The live
          invitee experience is at <code>/events/&lt;slug&gt;</code>.
        </p>
      </div>

      {/* AD FUNNEL — the /event-quiz routing page */}
      <Section title="🚀 Paid-ad routing — /event-quiz">
        <p className="text-sm text-gray-700 mb-3">
          Send ads to <code>/event-quiz</code>. The visitor sees the bachelor
          landing page behind a 4-step modal: party type → delivery timing →
          needs (multi-select) → contact info. On submit we create a Lead,
          send a welcome email summarizing every service we offer + Premier
          Party Cruises, and route them to the matching landing page with{' '}
          <code>?welcome=1</code> so the hero changes to{' '}
          <strong>&quot;Step one: Let&apos;s get started with your drinks.&quot;</strong>
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Link
            href="/event-quiz"
            target="_blank"
            className="flex items-center justify-between gap-3 p-3 rounded-md border-2 border-purple-400 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <div className="min-w-0">
              <div className="font-bold text-sm text-purple-900">
                /event-quiz (live)
              </div>
              <div className="text-xs text-purple-800">
                Bachelor landing + modal quiz. Public, but noindex.
              </div>
            </div>
            <span className="text-purple-700 font-bold text-xs whitespace-nowrap">
              OPEN →
            </span>
          </Link>
          <Link
            href="/admin/brians-stuff?tab=leads"
            className="flex items-center justify-between gap-3 p-3 rounded-md border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900">
                See submissions in Leads tab
              </div>
              <div className="text-xs text-gray-600">
                Filter <code>metadata.eventQuiz.partyType</code> to slice by intent.
              </div>
            </div>
            <span className="text-purple-700 font-bold text-xs whitespace-nowrap">
              OPEN →
            </span>
          </Link>
        </div>
        <details className="rounded-md border border-gray-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-bold tracking-widest text-gray-700">
            ROUTING TABLE (party type → landing page)
          </summary>
          <ul className="text-xs text-gray-700 mt-2 space-y-0.5">
            <li>Bachelor party → <code>/austin-bachelor-party-delivery</code></li>
            <li>Bachelorette party → <code>/austin-bachelorette-party-delivery</code></li>
            <li>Corporate event → <code>/austin-corporate-event-delivery</code></li>
            <li>Wedding party → <code>/austin-wedding-weekend-delivery</code></li>
            <li>Boat / House / Hotel / Just deliver → <code>/austin-bachelor-party-delivery</code> (fallback for now)</li>
          </ul>
          <p className="text-[11px] text-gray-500 mt-2 italic">
            Edit the routing in <code>src/lib/eventQuiz/routing.ts</code>.
          </p>
        </details>
      </Section>

      {/* Demo links */}
      <Section title="Live demos">
        <p className="text-sm text-gray-700 mb-3">
          Open these in a new tab to see what an invitee sees.
        </p>
        <div className="space-y-2">
          {events.map((ev) => (
            <Link
              key={ev.slug}
              href={`/events/${ev.slug}`}
              target="_blank"
              className="flex items-center justify-between gap-4 p-3 rounded-md border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900">{ev.title}</div>
                <div className="text-xs text-gray-600 truncate">
                  {new Date(ev.startsAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · {ev.venue} · {ev.cityState}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Theme: <code>{ev.theme}</code> · Status:{' '}
                  <code>{ev.status}</code> · Drinks:{' '}
                  <code>{ev.drinks.mode}</code>
                </div>
              </div>
              <span className="text-purple-700 font-bold text-xs whitespace-nowrap">
                OPEN INVITE →
              </span>
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3 italic">
          Edit demo events at <code>src/lib/events/demoEvents.ts</code>.
        </p>
      </Section>

      {/* Organizer UX mockup */}
      <Section title="Organizer side (mockup)">
        <p className="text-sm text-gray-700 mb-3">
          Here&apos;s what the &quot;Create a new event&quot; flow looks like
          conceptually. Each card maps to a section we&apos;ll build out once
          you sign off on the invitee experience.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <MockCard
            num="1"
            title="Name your party"
            body="Title, host name + tagline, theme picker (birthday, bachelor, wedding, corporate, casual). Theme drives the color palette."
          />
          <MockCard
            num="2"
            title="When & where"
            body="Start + end time, timezone, venue name + full address, day-of contact (used for delivery handoff)."
          />
          <MockCard
            num="3"
            title="Hero + vibes"
            body="One hero photo + up to 5 gallery images. Upload from device or pick from POD's stock library."
          />
          <MockCard
            num="4"
            title="Need-to-know details"
            body="Dress code, parking, food, music, anything else. Free-form label/value pairs shown in the right rail."
          />
          <MockCard
            num="5"
            title="RSVP rules"
            body="Capacity, RSVP deadline, +1 policy. Send text reminders to RSVPed phone numbers."
          />
          <MockCard
            num="6"
            title="Drink menu"
            body="Pick: full POD catalog, curated subset (you pick the bottles), or package-only. Set a per-person budget hint + cutoff time."
          />
          <MockCard
            num="7"
            title="Invite people"
            body="Share link, SMS blast to phone list, Facebook share, or paste a CSV of contacts. (Future: pull from Facebook friends + iCloud contacts.)"
          />
          <MockCard
            num="8"
            title="Manage live"
            body="See the RSVP list, who ordered what, total bar spend per guest, send reminders, push delivery instructions to POD ops."
          />
        </div>
      </Section>

      {/* How it works for invitees */}
      <Section title="How it works for invitees">
        <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-700">
          <li>
            They land on <code>/events/&lt;slug&gt;</code> via text or
            shared link.
          </li>
          <li>
            See the full invite — hero with countdown, host info, date,
            venue, vibes gallery, need-to-know details.
          </li>
          <li>
            Click <strong>RSVP NOW</strong> → quick form (name, email,
            phone, +1 count, optional message). Form submission auto-fires
            into <Link href="/admin/brians-stuff?tab=leads" className="underline text-purple-700">
              the Leads table
            </Link>.
          </li>
          <li>
            On RSVP success, the <strong>Order Drinks</strong> pop-up
            opens automatically. They pick what they want from the
            curated menu (or full catalog), see a running total, and check
            out. Payment is theirs alone — bill separate from every other
            invitee&apos;s.
          </li>
          <li>
            All separate orders get grouped server-side by venue +
            delivery window. POD delivers one truck, drops every box with
            the guest&apos;s name on it 30 min before doors.
          </li>
          <li>
            Host can&apos;t see who ordered what (privacy). Host CAN see
            total RSVPs + total guest count.
          </li>
        </ol>
      </Section>

      {/* Differentiator */}
      <Section title="Why this beats Eventbrite / Posh / Partyfly">
        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
          <li>
            <strong>BYOB at scale.</strong> Nobody else lets every guest
            pre-order their own drinks with a single delivery to the
            host&apos;s address.
          </li>
          <li>
            <strong>Host doesn&apos;t break their bank.</strong> The host
            pays $0 for booze. Guests pay their own way. Host just covers
            venue + food.
          </li>
          <li>
            <strong>No more &quot;what do you want me to bring?&quot; texts.</strong>{' '}
            Everyone orders exactly what they want, ahead of time.
          </li>
          <li>
            <strong>Built on POD&apos;s delivery infrastructure.</strong>{' '}
            TABC-licensed, cold delivery, 500+ Austin parties. Other
            invite apps would have to build that from scratch.
          </li>
          <li>
            <strong>Text-first invites.</strong> Modern people don&apos;t
            check email. Phone reminders + SMS-native share.
          </li>
        </ul>
      </Section>

      {/* Build status */}
      <Section title="Build status">
        <div className="space-y-2 text-sm">
          <Status label="Invitee-facing event page" state="ready" detail="/events/[slug] live" />
          <Status label="RSVP form + lead capture" state="ready" detail="Wired to /admin/brians-stuff?tab=leads" />
          <Status label="BYOB drink-order pop-up" state="ready" detail="Mockup checkout; real Stripe wiring pending" />
          <Status label="Curated drink menu resolver" state="ready" detail="Pulls from Postgres products table" />
          <Status
            label="Organizer create/edit UI"
            state="todo"
            detail="Will replace this mockup section once invitee UX is signed off"
          />
          <Status label="DB persistence (events, rsvps, orders)" state="todo" detail="New Prisma models when ready" />
          <Status label="SMS invite blast" state="todo" detail="Hooks into existing GoHighLevel webhook" />
          <Status label="Per-RSVP separate Stripe checkout" state="todo" detail="Reuses existing draft-order infra" />
          <Status label="Facebook friend import" state="exploring" detail="Requires FB Graph API + user OAuth" />
        </div>
      </Section>

      {/* Component map */}
      <Section title="Component map (for engineers)">
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-md p-4 overflow-x-auto">
{`src/
├── app/events/[slug]/page.tsx              ← invitee-facing route
├── components/events/
│   ├── EventInvitePage.tsx                 ← hero, RSVP card, vibes, share
│   └── OrderDrinksModal.tsx                ← BYOB pop-up
├── lib/events/
│   ├── types.ts                            ← EventInvite, RsvpRecord
│   ├── theme.ts                            ← per-theme color palette
│   ├── demoEvents.ts                       ← hard-coded demos (mockup phase)
│   └── getEventDrinkOptions.ts             ← resolve curated handles → variants
└── components/admin/EventsView.tsx         ← THIS tab (docs + mockup)`}
        </pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5">
      <h2 className="text-lg font-bold tracking-wide text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function MockCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold text-purple-700">#{num}</span>
        <h4 className="font-bold text-sm text-gray-900">{title}</h4>
      </div>
      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function Status({
  label,
  state,
  detail,
}: {
  label: string;
  state: 'ready' | 'todo' | 'exploring';
  detail?: string;
}) {
  const palette: Record<
    'ready' | 'todo' | 'exploring',
    { bg: string; fg: string; icon: string }
  > = {
    ready: { bg: '#DCFCE7', fg: '#166534', icon: '✓' },
    todo: { bg: '#FEF3C7', fg: '#92400E', icon: '○' },
    exploring: { bg: '#DBEAFE', fg: '#1E40AF', icon: '…' },
  };
  const p = palette[state];
  return (
    <div className="flex items-start gap-2">
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: p.bg, color: p.fg }}
      >
        {p.icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        {detail && <div className="text-xs text-gray-500">{detail}</div>}
      </div>
    </div>
  );
}
