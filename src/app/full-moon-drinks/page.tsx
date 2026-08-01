import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EVENT, LOCATION } from '@/components/full-moon/event';
import DrinksLanderCta from '@/components/full-moon/DrinksLanderCta';

export const metadata: Metadata = {
  title: 'Full Moon Party — Order Your Drinks · Party On Delivery',
  description: `The Full Moon Party cruise is BYOB. Order beer, wine, spirits & mixers ahead — iced in a labeled cooler waiting at ${LOCATION.name} on ${EVENT.dateLabel}.`,
  alternates: { canonical: '/full-moon-drinks' },
  openGraph: {
    title: 'Full Moon Party — Order Your Drinks',
    description: `BYOB cruise, ${EVENT.dateLabel}. Order ahead — your cooler is iced and waiting at the dock.`,
    images: ['/images/full-moon/moonrise-dance-hero.webp'],
  },
  robots: { index: false, follow: true },
};

const MENU: Array<{ title: string; body: string }> = [
  { title: 'Beer & Seltzers', body: 'Local cans, imports, and every seltzer your crew argues about' },
  { title: 'Wine & Bubbles', body: 'Whites, rosés, and champagne for the moonrise toast' },
  { title: 'Spirits', body: 'Tequila, vodka, whiskey, rum — full bottles, boat-ready' },
  { title: 'Mixers & More', body: 'Sodas, juices, ranch water fixings, limes and all' },
  { title: 'Ice & Cups', body: 'Already on the boat, on us — water too' },
  { title: 'Cocktail Kits', body: 'Batched kits if you want zero thinking on deck' },
];

const STEPS: Array<{ n: string; title: string; body: string }> = [
  { n: '1', title: 'Build your order', body: 'Browse the full menu and add what your crew drinks. Everyone orders their own — no group math.' },
  { n: '2', title: 'We pack & ice it', body: `Your order is shopped, packed, and iced in a labeled cooler before cast-off. Marina, date, and time are already set — ${EVENT.dateLabel}, at the dock.` },
  { n: '3', title: 'Grab it at the dock', body: `Show your ID (21+), take your cooler aboard, and that’s it — cold from the first song to the last.` },
];

/**
 * /full-moon-drinks — drinks-ordering lander for Full Moon Party ticket
 * holders. Partner-lander pattern, scoped to this event: the CTA opens
 * /order in event-preset mode, so each buyer gets their OWN order with the
 * marina address, Aug 28 date, and dock window pre-filled (see the
 * 'full-moon' entry in src/lib/events/event-presets.ts). Nav-less dark page
 * matching the rest of the event funnel.
 */
export default function FullMoonDrinksPage(): ReactElement {
  return (
    <div className="min-h-screen bg-[#070a1c] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="font-heading tracking-[0.25em] uppercase text-sm text-cyan-300 mb-2 text-center">
          Lake Travis Full Moon Party &middot; {EVENT.dateLabel}
        </p>
        <h1 className="font-heading tracking-[0.06em] uppercase text-4xl md:text-6xl leading-[0.95] mb-4 text-center">
          <span className="text-[#eaf2ff]">Full Moon</span>{' '}
          <span className="text-cyan-300">drinks,</span>
          <br />
          <span className="text-[#eaf2ff]">iced at the dock.</span>
        </h1>
        <p className="text-base leading-relaxed text-[#c7d2ea] mb-6 text-center max-w-xl mx-auto">
          The cruise is BYOB — and this is the easy way to B. Order ahead and your cooler is packed,
          iced, and <strong className="text-white">waiting at {LOCATION.name}</strong> when you board.
          Delivery date and dock are already set; all you pick is the drinks.
        </p>
        <div className="text-center mb-12">
          <DrinksLanderCta label="Browse the menu & start your order" section="hero" />
        </div>

        <div className="relative rounded-xl overflow-hidden mb-12">
          <Image
            src="/images/full-moon/lake-party.webp"
            alt="Guests enjoying a party cruise on Lake Travis"
            width={1200}
            height={675}
            className="w-full h-auto object-cover"
          />
        </div>

        <h2 className="font-heading tracking-[0.1em] uppercase text-2xl text-[#eaf2ff] mb-4 text-center">
          What&rsquo;s on the menu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          {MENU.map((m) => (
            <div key={m.title} className="rounded-lg border border-[#24305c] bg-[#131c3f] px-5 py-4">
              <p className="font-heading tracking-[0.08em] uppercase text-lg text-[#eaf2ff] m-0">{m.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#8fa3cc] m-0">{m.body}</p>
            </div>
          ))}
        </div>

        <h2 className="font-heading tracking-[0.1em] uppercase text-2xl text-[#eaf2ff] mb-4 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-lg border border-[#24305c] bg-[#131c3f] px-5 py-4">
              <p className="font-heading text-3xl text-cyan-300 m-0">{s.n}</p>
              <p className="font-heading tracking-[0.08em] uppercase text-lg text-[#eaf2ff] mt-1 mb-1">{s.title}</p>
              <p className="text-sm leading-relaxed text-[#8fa3cc] m-0">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <DrinksLanderCta label="Start your drink order" section="final_cta" />
        </div>
        <p className="text-sm text-[#8fa3cc] text-center mb-12">
          Don&rsquo;t have a ticket yet?{' '}
          <Link href="/full-moon-aug28" className="text-cyan-300 underline">
            Grab your spot on the boat first
          </Link>
          .
        </p>

        <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/full-moon-aug28" className="text-cyan-300 underline text-sm">
            &larr; Back to the event page
          </Link>
          <Link href="/full-moon-terms" className="text-[#8fa3cc] underline text-sm">
            Event terms
          </Link>
          <p className="text-xs text-gray-500 m-0 w-full text-center sm:w-auto">
            &copy; 2026 Party On Delivery LLC &middot; 21+ &middot; ID required at the dock &middot; Drink responsibly
          </p>
        </div>
      </div>
    </div>
  );
}
