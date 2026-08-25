import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import PostponedBanner from '@/components/full-moon/PostponedBanner';
import { EVENT, LOCATION, TICKET_TOTAL_DISPLAY } from '@/components/full-moon/event';
import ThanksShare from '@/components/full-moon/ThanksShare';

export const metadata: Metadata = {
  title: 'You’re on the boat · Lake Travis Full Moon Party',
  description: 'Ticket confirmed — here’s everything you need for the Lake Travis Full Moon Party.',
  // Post-purchase page; never useful in search results.
  robots: { index: false, follow: false },
};

/** One dark info card. */
function Card({ label, children }: { label: string; children: ReactElement | string }): ReactElement {
  return (
    <div className="rounded-lg border border-[#24305c] bg-[#131c3f] px-5 py-4 text-center">
      <p className="text-[11px] tracking-[0.2em] uppercase text-[#8fa3cc] m-0">{label}</p>
      <div className="mt-1 font-heading tracking-[0.06em] text-2xl text-[#eaf2ff]">{children}</div>
    </div>
  );
}

/**
 * /full-moon-thanks — where Stripe drops buyers after a successful ticket
 * purchase (the ticket route's success_url). Mirrors the confirmation email:
 * thank-you, the event facts, drinks CTA, and a big share push — every buyer
 * is a recruiter toward the 32-guest minimum. Reads event.ts, so a reschedule
 * updates it automatically.
 */
export default function FullMoonThanksPage(): ReactElement {
  return (
    <>
      <PostponedBanner />
    <div className="min-h-screen bg-[#070a1c] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="font-heading tracking-[0.25em] uppercase text-sm text-cyan-300 mb-2">Ticket confirmed</p>
        <h1 className="font-heading tracking-[0.06em] uppercase text-4xl md:text-5xl leading-[0.95] mb-3">
          <span className="text-[#eaf2ff]">Thank you —</span>
          <br />
          <span className="text-cyan-300">you&rsquo;re on the boat.</span>
        </h1>
        <p className="text-base leading-relaxed text-[#c7d2ea] mb-8">
          Your spot on the <strong className="text-white">Lake Travis Full Moon Party</strong> is locked in, and a
          confirmation email with all of this is on its way (check spam if it hides). {EVENT.dateLabel} is the
          real full moon — it comes up over the water while we&rsquo;re out there.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Card label="The date">{EVENT.dateLabel}</Card>
          <Card label="Cast off">{EVENT.castOff}</Card>
          <Card label="Back at dock">{EVENT.backAtDock}</Card>
        </div>

        <div className="rounded-lg border border-[#24305c] bg-[#131c3f] px-5 py-4 text-center mb-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#8fa3cc] m-0">Where we board</p>
          <p className="mt-1 font-heading tracking-[0.06em] text-2xl text-[#eaf2ff] m-0">{LOCATION.name}</p>
          <p className="mt-1 text-sm m-0">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(LOCATION.address)}`}
              className="text-cyan-300 underline"
            >
              {LOCATION.address}
            </a>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#8fa3cc] m-0">
            Exact dock + a pin drop go out by text two days before the cruise. Arrive 15 minutes early.
          </p>
        </div>

        <h2 className="font-heading tracking-[0.1em] uppercase text-xl text-[#eaf2ff] mb-2">What&rsquo;s on board</h2>
        <ul className="text-sm leading-7 text-[#c7d2ea] mb-8 list-none p-0 m-0">
          <li><span className="text-cyan-300">&bull;</span> A four-hour cruise with captain &amp; crew</li>
          <li><span className="text-cyan-300">&bull;</span> A full taco bar — included with your ticket ({TICKET_TOTAL_DISPLAY}, tax included)</li>
          <li><span className="text-cyan-300">&bull;</span> Smooth beats by DJ Trey</li>
          <li><span className="text-cyan-300">&bull;</span> Water, ice &amp; cups &middot; life jackets &amp; floats</li>
        </ul>

        <div className="rounded-lg border border-[#24305c] bg-[#131c3f] px-6 py-5 mb-10">
          <h2 className="font-heading tracking-[0.1em] uppercase text-xl text-[#eaf2ff] mt-0 mb-2">
            One thing left: your drinks
          </h2>
          <p className="text-sm leading-relaxed text-[#c7d2ea] mb-4">
            The cruise is BYOB — bring your own from any store you like. Easiest: order from us and we&rsquo;ll have
            them <strong className="text-white">iced in a cooler waiting at the dock</strong>, loaded at cast off.
          </p>
          <Link
            href="/full-moon-drinks?utm_source=thanks&utm_medium=web&utm_campaign=full-moon-aug28"
            className="inline-block rounded-lg bg-brand-yellow px-6 py-3 text-sm font-semibold tracking-[0.08em] uppercase text-gray-900 no-underline hover:opacity-90"
          >
            Order your drinks
          </Link>
        </div>

        <h2 className="font-heading tracking-[0.1em] uppercase text-xl text-[#eaf2ff] mb-2">
          Now — bring your people
        </h2>
        <p className="text-sm leading-relaxed text-[#c7d2ea] mb-4">
          We sail at {EVENT.minimum} and the boat holds {EVENT.capacity}. The fastest way to make this night great
          is to fill the deck with your own crew — send it to your friends.
        </p>
        <ThanksShare />

        <div className="border-t border-white/10 pt-6 mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/full-moon-aug28" className="text-cyan-300 underline text-sm">
            &larr; Back to the event page
          </Link>
          <Link href="/full-moon-terms" className="text-[#8fa3cc] underline text-sm">
            Event terms
          </Link>
          <p className="text-xs text-gray-500 m-0">
            Questions? Reply to your confirmation email or write info@partyondelivery.com
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
