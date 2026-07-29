import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import Link from 'next/link';
import { EVENT, LOCATION, TICKET_TOTAL_DISPLAY } from '@/components/full-moon/event';

export const metadata: Metadata = {
  title: 'Event Terms · Lake Travis Full Moon Party · Party On Delivery',
  description: 'Ticket terms for the Lake Travis Full Moon Party — boarding, BYOB rules, safety, weather, and refunds.',
  alternates: { canonical: '/full-moon-terms' },
  // Utility page linked from the ticket modal + confirmation email; keep it
  // out of the index so it never competes with the event page.
  robots: { index: false, follow: true },
};

/** One titled terms section. */
function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="mb-8">
      <h2 className="font-heading tracking-[0.1em] uppercase text-xl text-white mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-300 space-y-2">{children}</div>
    </section>
  );
}

/**
 * /full-moon-terms — ticket terms for the Full Moon Party.
 *
 * Standalone dark page (no global nav), matching the event page it's linked
 * from (ticket-modal checkbox, event footer, confirmation email). Reads event
 * facts from event.ts so a reschedule updates the date/price here too.
 */
export default function FullMoonTermsPage(): ReactElement {
  return (
    <div className="min-h-screen bg-[#070a1c] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="font-heading tracking-[0.2em] uppercase text-sm text-cyan-300 mb-2">Lake Travis Full Moon Party</p>
        <h1 className="font-heading tracking-[0.1em] uppercase text-3xl md:text-4xl text-white mb-1">Event Terms</h1>
        <p className="text-sm text-gray-400 mb-10">
          {EVENT.dateLabel}, {EVENT.castOff}&ndash;{EVENT.backAtDock} &middot; Lake Travis, Austin, TX &middot; Last updated July 29, 2026
        </p>

        <Section title="Who runs what">
          <p>
            The Full Moon Party is organized by <strong className="text-white">Party On Delivery LLC</strong> (&ldquo;POD&rdquo;).
            The vessel is owned and operated by <strong className="text-white">Premier Party Cruises</strong>, whose captain and
            crew have exclusive authority over the operation and safety of the boat at all times. Follow crew
            instructions — on the water, the captain&rsquo;s word is final.
          </p>
        </Section>

        <Section title="Tickets, boarding & eligibility">
          <p>
            This event is for adults <strong className="text-white">25 and older</strong>. Bring a valid government-issued
            photo ID — everyone is carded at boarding, no exceptions. Boarding is at {LOCATION.name}
            ({LOCATION.address}); the exact dock and a pin drop are sent by text about two days before the
            cruise. Please arrive at least 15 minutes before cast-off — the boat cannot wait, and missed
            departures are not refunded.
          </p>
          <p>
            We may refuse boarding to anyone who appears intoxicated or unsafe, without a refund. Your ticket
            covers the cruise, captain and crew, DJ, taco bar, and water, ice &amp; cups
            ({`$${EVENT.price}`} + tax, {TICKET_TOTAL_DISPLAY} total per person).
          </p>
          <p>
            Tickets are transferable — if you can&rsquo;t make it, a friend 25+ can take your spot under your
            order name. Just reply to your confirmation email with their name so the guest list is right.
          </p>
        </Section>

        <Section title="Alcohol — BYOB">
          <p>
            Alcohol is <strong className="text-white">not included</strong> in your ticket, and event staff do not serve
            alcohol on board. This is a BYOB cruise: you may bring your own beverages from any store you like.
          </p>
          <p>
            If you pre-order drinks from Party On Delivery, that purchase is a separate retail transaction by
            POD, a TABC-licensed retailer. Orders are handed off at the dock to the purchaser (or their
            designated recipient), who must be 21+ and present valid ID — Texas law requires it, and unclaimed
            alcohol is not loaded or left unattended. Water, ice, and cups are provided for everyone.
          </p>
        </Section>

        <Section title="Assumption of risk">
          <p>
            This is a night cruise on open water with a live dance floor. Boats move — decks shift, surfaces
            get wet, and weather changes. By attending you acknowledge and voluntarily assume the risks
            inherent in being on a vessel, on water, at night. Life jackets and flotation devices are on board;
            crew will show you where.
          </p>
          <p>
            To the maximum extent permitted by Texas law, you release POD, Premier Party Cruises, and their
            owners, employees, and contractors from claims arising out of those inherent risks and from
            ordinary negligence. Nothing in these terms waives liability for gross negligence or willful
            misconduct, and nothing limits any right the law says can&rsquo;t be limited.
          </p>
        </Section>

        <Section title="Weather, the 32-guest minimum & refunds">
          <p>
            <strong className="text-white">Weather:</strong> safety calls belong to the captain. If the lake isn&rsquo;t safe, the
            cruise reschedules to the next available full-moon date or you get a full refund — your choice.
          </p>
          <p>
            <strong className="text-white">Minimum:</strong> we sail with {EVENT.minimum} or more guests. If we&rsquo;re short
            {' '}{EVENT.deadlineDays} days out, the cruise rolls to the next full moon and every ticket is
            refunded in full, automatically.
          </p>
          <p>
            Outside those two cases, tickets are non-refundable (but transferable, above).
          </p>
        </Section>

        <Section title="Conduct">
          <p>
            Follow crew instructions. Illegal substances, fighting, and unsafe behavior aren&rsquo;t tolerated —
            the captain may return to the dock and remove anyone endangering the group, without a refund.
            Swimming is not part of this event unless the captain explicitly permits it.
          </p>
          <p>
            If you&rsquo;ll be drinking, plan your ride home before you board. Group rides:{' '}
            <a href="https://www.fetii.com" className="text-cyan-300 underline">Fetii</a>, code{' '}
            <strong className="text-white">PartyOn</strong> for 25% off.
          </p>
        </Section>

        <Section title="Photos & video">
          <p>
            The event may be photographed and filmed, and imagery may be used to promote future cruises. If
            you&rsquo;d rather not appear, tell the crew at boarding or email us and we&rsquo;ll take care of it.
          </p>
        </Section>

        <Section title="Changes & contact">
          <p>
            We may update these terms; material changes are emailed to ticket holders. Questions, transfers,
            or anything else: <a href="mailto:info@partyondelivery.com" className="text-cyan-300 underline">info@partyondelivery.com</a>.
          </p>
        </Section>

        <div className="border-t border-white/10 pt-6 mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/full-moon-aug28" className="text-cyan-300 underline text-sm">
            &larr; Back to the Full Moon Party
          </Link>
          <p className="text-xs text-gray-500 m-0">
            &copy; 2026 Party On Delivery LLC &middot; Adults 25+ only &middot; Drink responsibly
          </p>
        </div>
      </div>
    </div>
  );
}
