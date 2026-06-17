import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import Image from 'next/image';
import BringChecklist from './BringChecklist';
import RsvpForm from './RsvpForm';

const HOST = 'BHill & Co';
const EVENT_SLUG = 'dads-gone-wild';
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Anderson+Mill+Marina';
const HERO_IMG = '/images/dads-gone-wild-hero.png';

const COPY = {
  navWordmark: HOST,
  heroEyebrow: "A BHill & Co Production · Father's Day",
  hook: 'Boats. Dads. Beers. Designated Wife Drivers.',
  subhead: "A family-friendly Father's Day cruise — you're invited.",
  dateChip: 'Sun · Jun 21',
  timeChip: '3:30 — 7:30 PM',
  heroTag: 'Actual footage · last year',
  cta: 'RSVP',
  nudge: "Spots are limited by the boat's tragic weight rating.",
  detailsEyebrow: 'The Fine Print (ignore it)',
  detailsH2: 'The Details',
  bringEyebrow: 'Potluck Of The Damned',
  bringH2: 'What To Bring',
  bringIntro:
    "It's potluck. Bring an app, a snack, a shareable something. Tap each one as you pack it — or don't, we're not your dad.",
  rsvpEyebrow: 'No Take-Backs',
  rsvpH2: 'RSVP',
  footer: "BHill & Co · Lake Travis · Father's Day",
};

const MARQUEE = 'Free Sunburn · BYO Regret · Potluck Or Perish · No Wake, All Party';

type Detail = { no: string; label: string; value: string; note: ReactNode };

const DETAILS: Detail[] = [
  {
    no: '01',
    label: 'When',
    value: 'Sun · Jun 21',
    note: "3:30 to 7:30 PM. Show up at 3:31 and you're swimming out.",
  },
  {
    no: '02',
    label: 'Where',
    value: 'Anderson Mill Marina',
    note: (
      <a
        href={MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand-blue underline"
      >
        Open in Maps
      </a>
    ),
  },
  {
    no: '03',
    label: 'Your Captain',
    value: HOST,
    note: "Will steer. Probably. Has a hat, so it's official.",
  },
];

export const metadata: Metadata = {
  title: "Boats. Dads. Beers. Designated Wife Drivers. | Father's Day Cruise",
  description:
    "A family-friendly Father's Day cruise on Lake Travis — Sunday, June 21, 3:30–7:30 PM at Anderson Mill Marina. RSVP and claim your spot on the boat.",
  alternates: { canonical: '/dads-gone-wild' },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Boats. Dads. Beers. Designated Wife Drivers. | Father's Day Cruise",
    description:
      "A family-friendly Father's Day cruise. You're invited — Sunday, June 21 · Lake Travis.",
    images: [{ url: HERO_IMG }],
    type: 'website',
  },
};

/** Small inline star used as the marquee separator (icons are SVG, not glyphs). */
function StarIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-brand-yellow" aria-hidden="true">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.86-5-4.87 7.1-1.01z" />
    </svg>
  );
}

/** The repeating ticker content; rendered twice so a -50% loop is seamless. */
function MarqueeTrack(): ReactElement {
  return (
    <div className="flex w-max animate-marquee">
      {[0, 1].map((half) => (
        <div key={half} className="flex shrink-0 items-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center">
              <span className="px-3 font-heading text-sm font-bold uppercase tracking-[0.14em] text-brand-yellow md:px-5 md:text-base">
                {MARQUEE}
              </span>
              <StarIcon />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * One-off Father's Day cruise invite ("Boats. Dads. Beers. Designated Wife
 * Drivers.") served at /dads-gone-wild.
 *
 * Responsive: on phones (<768px) it's the slim, centered phone-width card;
 * at md+ it becomes a full-width landing page with a cinematic hero banner
 * (the photo full-bleed behind overlaid copy) and wider multi-column
 * sections. Self-contained (no global nav/footer — this route lives outside
 * the (main) layout group). RSVPs persist via POST /api/events/rsvp.
 */
export default function DadsGoneWildPage(): ReactElement {
  return (
    <div className="min-h-screen bg-cream font-sans text-gray-900">
      <div className="mx-auto max-w-[480px] overflow-hidden bg-cream shadow-[0_0_80px_rgba(10,31,51,0.12)] md:max-w-none md:overflow-visible md:bg-transparent md:shadow-none">
        {/* ===== Sticky mini-nav (full-width bar; content centered at md+) ===== */}
        <nav className="sticky top-0 z-[60] border-b border-gray-200 bg-cream/[0.86] backdrop-blur-[8px]">
          <div className="mx-auto flex max-w-[480px] items-center justify-between px-5 py-3 md:max-w-5xl md:px-8 md:py-4">
            <span className="font-heading text-base font-bold uppercase tracking-[0.06em] text-gray-900 md:text-lg">
              {COPY.navWordmark}
            </span>
            <a
              href="#rsvp"
              className="rounded-lg bg-brand-yellow px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-gray-900 transition-colors hover:bg-yellow-400 md:px-5 md:text-sm"
            >
              RSVP
            </a>
          </div>
        </nav>

        {/* ===== Hero — mobile (stacked card) ===== */}
        <section className="relative overflow-hidden px-6 pb-12 pt-10 text-center md:hidden">
          <div
            className="pointer-events-none absolute -right-[60px] -top-[60px] h-60 w-60 rounded-full opacity-[0.85] blur-[2px]"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, var(--color-brand-yellow), var(--color-gold))',
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-[30px] -left-[50px] h-40 w-40 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 40% 40%, rgba(11,116,184,0.35), transparent 70%)',
            }}
          />

          <div className="relative">
            <span className="eyebrow block text-xs text-brand-blue">{COPY.heroEyebrow}</span>
            <h1 className="mt-3.5 font-heading text-[clamp(42px,13vw,60px)] font-bold uppercase leading-[0.94] text-gray-900">
              {COPY.hook}
            </h1>
            <p className="editorial mx-auto mt-4 max-w-[320px] text-[21px] text-brand-blue">
              {COPY.subhead}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <div className="rounded-full bg-navy px-4 py-2.5 font-heading text-sm font-semibold uppercase tracking-[0.06em] text-white">
                {COPY.dateChip}
              </div>
              <div className="rounded-full border border-gray-300 bg-white px-4 py-2.5 font-heading text-sm font-semibold uppercase tracking-[0.06em] text-gray-900">
                {COPY.timeChip}
              </div>
            </div>

            <div className="relative mt-7 aspect-[4/3] overflow-hidden rounded-2xl border-[3px] border-navy shadow-md">
              <Image
                src={HERO_IMG}
                alt="Dads celebrating on a Father's Day lake cruise"
                fill
                sizes="480px"
                priority
                className="object-cover"
              />
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-brand-yellow px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-[0.08em] text-gray-900">
                {COPY.heroTag}
              </span>
            </div>

            <a
              href="#rsvp"
              className="mt-6 block rounded-lg bg-brand-yellow p-[18px] font-sans text-base font-bold uppercase tracking-[0.08em] text-gray-900 transition-colors hover:bg-yellow-400"
            >
              {COPY.cta}
            </a>
            <p className="mt-2.5 text-sm text-gray-500">{COPY.nudge}</p>
          </div>
        </section>

        {/* ===== Hero — desktop (cinematic full-bleed banner) ===== */}
        <section className="relative hidden h-[78vh] max-h-[860px] min-h-[540px] overflow-hidden md:flex md:items-center md:justify-center">
          <Image
            src={HERO_IMG}
            alt="Dads celebrating on a Father's Day lake cruise"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/55 to-navy/90" />
          <div className="relative z-10 mx-auto max-w-3xl px-8 text-center text-white [text-shadow:0_2px_16px_rgba(10,31,51,0.55)]">
            <span className="eyebrow block text-sm text-brand-yellow">{COPY.heroEyebrow}</span>
            <h1 className="mt-4 font-heading text-6xl font-bold uppercase leading-[0.92] lg:text-7xl">
              {COPY.hook}
            </h1>
            <p className="editorial mx-auto mt-5 max-w-xl text-2xl text-white lg:text-[26px]">
              {COPY.subhead}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <div className="rounded-full bg-brand-yellow px-5 py-2.5 font-heading text-base font-semibold uppercase tracking-[0.06em] text-gray-900">
                {COPY.dateChip}
              </div>
              <div className="rounded-full border border-white/40 bg-white/10 px-5 py-2.5 font-heading text-base font-semibold uppercase tracking-[0.06em] text-white backdrop-blur-sm">
                {COPY.timeChip}
              </div>
            </div>

            <a
              href="#rsvp"
              className="mt-8 inline-block rounded-lg bg-brand-yellow px-10 py-4 font-sans text-base font-bold uppercase tracking-[0.08em] text-gray-900 transition-colors hover:bg-yellow-400"
            >
              {COPY.cta}
            </a>
            <p className="mt-3 text-sm text-white/80">{COPY.nudge}</p>
          </div>
          <span className="absolute bottom-6 left-6 z-10 rounded-full bg-brand-yellow px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-[0.08em] text-gray-900">
            {COPY.heroTag}
          </span>
        </section>

        {/* ===== Marquee (full-bleed) ===== */}
        <div className="overflow-hidden whitespace-nowrap bg-navy py-3 md:py-4" aria-hidden="true">
          <MarqueeTrack />
        </div>

        {/* ===== The Details ===== */}
        <section className="px-6 pb-2 pt-12 md:px-8 md:pb-10 md:pt-20">
          <div className="mx-auto md:max-w-5xl">
            <span className="eyebrow block text-xs text-brand-blue md:text-sm">
              {COPY.detailsEyebrow}
            </span>
            <h2 className="mt-1.5 font-heading text-[34px] font-bold uppercase text-gray-900 md:text-5xl">
              {COPY.detailsH2}
            </h2>
            <span className="my-3 block h-px w-16 bg-brand-yellow md:my-4" />

            <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:gap-5">
              {DETAILS.map((d) => (
                <div
                  key={d.no}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6"
                >
                  <span className="min-w-[34px] font-fraunces text-3xl font-medium italic leading-none text-brand-blue md:text-4xl">
                    {d.no}
                  </span>
                  <div className="flex-1">
                    <div className="font-heading text-[15px] font-bold uppercase tracking-[0.1em] text-gray-500">
                      {d.label}
                    </div>
                    <div className="mt-0.5 font-heading text-2xl font-bold uppercase text-gray-900 md:text-[28px]">
                      {d.value}
                    </div>
                    <p className="mt-1.5 text-sm text-gray-600 md:text-base">{d.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== What To Bring ===== */}
        <section className="px-6 pb-2 pt-10 md:px-8 md:pb-10 md:pt-16">
          <div className="mx-auto md:max-w-5xl">
            <span className="eyebrow block text-xs text-brand-blue md:text-sm">
              {COPY.bringEyebrow}
            </span>
            <h2 className="mt-1.5 font-heading text-[34px] font-bold uppercase text-gray-900 md:text-5xl">
              {COPY.bringH2}
            </h2>
            <span className="my-3 block h-px w-16 bg-brand-yellow md:my-4" />
            <p className="mb-5 text-sm text-gray-600 md:mb-7 md:max-w-2xl md:text-base">
              {COPY.bringIntro}
            </p>
            <BringChecklist />
          </div>
        </section>

        {/* ===== RSVP (full-bleed navy; content centered) ===== */}
        <section
          id="rsvp"
          className="mt-11 scroll-mt-16 rounded-t-[28px] bg-navy px-6 pb-[52px] pt-11 text-white md:mt-16 md:rounded-t-[40px] md:px-8 md:pb-20 md:pt-16"
        >
          <div className="mx-auto md:max-w-xl">
            <span className="eyebrow block text-xs text-brand-yellow md:text-sm">
              {COPY.rsvpEyebrow}
            </span>
            <h2 className="mt-1.5 font-heading text-4xl font-bold uppercase text-white md:text-5xl">
              {COPY.rsvpH2}
            </h2>
            <span className="my-3 block h-px w-16 bg-brand-yellow md:my-4" />

            <RsvpForm event={EVENT_SLUG} hostName={HOST} />

            <p className="mt-8 text-center font-heading text-[13px] font-bold uppercase tracking-[0.14em] text-white/50 md:mt-10">
              {COPY.footer}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
