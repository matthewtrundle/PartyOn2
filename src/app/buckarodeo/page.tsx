import type { Metadata } from 'next';
import type { ReactElement, ReactNode, SVGProps } from 'react';
import Image from 'next/image';
import BuckarodeoNav from './BuckarodeoNav';
import CoolerShop from './CoolerShop';
import Faq from './Faq';
import TexasBackdrop from './TexasBackdrop';
import { getProductsByHandles } from '@/lib/products/curated';

const ORDER_HREF = '/order?event=rodeo-cruise&ref=PREMIER&p=boat&d=boat';
const MAP_URL =
  'https://www.google.com/maps/search/?api=1&query=13993+FM+2769+Leander+TX+78641';

const HERO_SUBHEAD =
  'You’re booked for the Buckarodeo — this is where you order the drinks. We deliver them straight to your boat, iced and ready. Free, and no minimum.';
const CTA_SUBHEAD =
  'Order your drinks now — we’ll have them iced and waiting on your boat. Free delivery, no minimum.';

const MARQUEE_ITEMS = [
  'Ice Cold',
  'Boots Optional',
  'Ranch Water On Deck',
  'Delivered To The Dock',
  'No Cooler Left Behind',
  'Yeehaw',
];

const STEPS = [
  {
    n: '01',
    h: 'Start your crew’s order',
    p: 'Tap below and we’ll spin up a private order page just for your group.',
  },
  {
    n: '02',
    h: 'Load the cooler',
    p: 'Add your drinks, or share your group’s link so everyone chips in their picks.',
  },
  {
    n: '03',
    h: 'We deliver to the dock',
    p: 'Iced down in your group’s own cooler, dropped at the marina before you board.',
  },
];

interface DetailItem {
  n: string;
  label: string;
  main: string;
  sub: string;
  map?: boolean;
}

const DETAILS: DetailItem[] = [
  { n: '01', label: 'When', main: 'Sunday, July 12, 2026', sub: 'Boarding at 11:00 AM' },
  {
    n: '02',
    label: 'Where',
    main: 'Lake Travis boarding dock',
    sub: '13993 FM 2769, Leander TX 78641',
    map: true,
  },
  {
    n: '03',
    label: 'Delivery',
    main: 'Delivered to your boat before you board.',
    sub: 'Order by 24 hours ahead — Saturday, July 11.',
  },
  {
    n: '04',
    label: 'Good To Know',
    main: 'Free delivery, no minimum',
    sub: 'Straight to your boat · Must be 21+',
  },
];

/** The 12 crowd-pleaser SKUs to surface on the page, in display order. */
const CROWD_PLEASER_HANDLES = [
  'high-noon-vodka-soda-combo-3-each-grapefruit-9-pineapple-9-black-cherry-9-watermelon-9-355ml-12-pack',
  'michelob-ultra-24-can-suitcase-12oz',
  'surfside-starter-pack-variety-8-pack-12oz',
  'modelo-especial-24pack-12oz-cans',
  'lady-bird-margarita-serves-16',
  'barton-springs-mojito-serves-16',
  'espolon-tequila-blanco-80-1l',
  'titos-handmade-vodka-80-1lt',
  'rambler-sparkling-water-lemon-lime-12-pack-12oz-can',
  'austin-beerworks-variety-pack-12-pack-12oz-can',
  'aperol-spritz-party-pitcher-kit-16-drinks',
  'amor-di-amanti-prosecco-spumante-750-ml',
];

export const metadata: Metadata = {
  title: 'Buckarodeo · Order Your Drinks | Party On Delivery',
  description:
    'Order your drinks for the Buckarodeo — Sunday, July 12 on Lake Travis. Free delivery straight to your boat, no minimum. Questions? Text or call (737) 371-9700.',
  alternates: { canonical: '/buckarodeo' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Buckarodeo · Order Your Drinks',
    description:
      'Sunday, July 12 on Lake Travis. Order your drinks — free delivery straight to your boat, no minimum.',
    type: 'website',
  },
};

/** Right-pointing arrow used inside CTA buttons. */
function ArrowRight(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Primary yellow CTA → starts a Premier-attributed boat order. */
function OrderButton({ label }: { label: string }): ReactElement {
  return (
    <a
      href={ORDER_HREF}
      className="inline-flex items-center gap-3 rounded-lg bg-brand-yellow px-[42px] py-[18px] font-heading text-[22px] font-bold uppercase tracking-[0.08em] text-black shadow-[0_6px_22px_rgba(11,31,51,0.18)] transition-colors hover:bg-yellow-400"
    >
      {label}
      <ArrowRight />
    </a>
  );
}

/** Four-point sparkle separator for the marquee. */
function Sparkle(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0 fill-brand-yellow" aria-hidden="true">
      <polygon points="12,3 14,10 21,12 14,14 12,21 10,14 3,12 10,10" />
    </svg>
  );
}

/** Continuous ticker — content rendered twice so the -50% loop is seamless. */
function Marquee(): ReactElement {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-white/20 bg-brand-blue py-4" aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {MARQUEE_ITEMS.map((item) => (
              <span key={item} className="flex items-center">
                <span className="px-[22px] font-heading text-lg font-bold uppercase tracking-[0.16em] text-white">
                  {item}
                </span>
                <Sparkle />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Eyebrow + heading + short yellow rule, used atop each light section. */
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }): ReactElement {
  return (
    <>
      <p className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-heading text-3xl font-bold uppercase tracking-[0.06em] text-gray-900 md:text-4xl">
        {title}
      </h2>
      <span className="mb-10 mt-[18px] block h-0.5 w-16 bg-brand-yellow" />
    </>
  );
}

/** Hero detail chip (icon + label). */
function Chip({ icon, label }: { icon: ReactNode; label: string }): ReactElement {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-brand-blue/20 bg-white/70 px-[18px] py-2.5 text-sm text-navy">
      <span className="inline-flex text-brand-blue">{icon}</span>
      {label}
    </span>
  );
}

const iconProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/**
 * Buckarodeo event order landing page (served at /buckarodeo).
 *
 * A one-off invite for guests of the July 12 Premier Party Cruises boat party:
 * the single job is to start a drink order (CTA → /order?ref=PREMIER&p=boat&d=boat,
 * which auto-creates a Premier-attributed boat dashboard per group). Self-contained
 * outside the (main) layout (its own sticky nav + footer), noindex. Ambient Texas
 * backdrop (contour-filled silhouette + Lone Star) parallax-scrolls behind every
 * section. Ported from the Claude Design handoff onto the project design system.
 */
export default async function BuckarodeoPage(): Promise<ReactElement> {
  const crowdPleasers = await getProductsByHandles(CROWD_PLEASER_HANDLES);
  return (
    <main className="overflow-x-hidden bg-white font-sans text-gray-900">
      <BuckarodeoNav />

      {/* ===== Hero ===== */}
      <section
        id="top"
        className="relative flex min-h-[88vh] items-center overflow-hidden"
        style={{
          background:
            'radial-gradient(125% 92% at 50% 6%, rgba(242,211,79,0.30), transparent 56%), linear-gradient(180deg, #FAF6EE 0%, #E6F0F7 100%)',
        }}
      >
        <TexasBackdrop tone="light" idKey="hero" />
        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6 pb-16 pt-[104px]">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Text column */}
            <div className="text-center lg:text-left">
              <p className="font-heading text-[15px] font-semibold uppercase tracking-[0.18em] text-brand-blue">
                ◆ Sunday · July 12 · Lake Travis ◆
              </p>
              <h1 className="mt-5 font-heading text-5xl font-bold uppercase leading-[0.95] tracking-[0.08em] text-navy md:text-6xl lg:text-7xl">
                Buckarodeo
              </h1>
              <p className="mx-auto mt-5 max-w-[520px] text-xl leading-relaxed text-gray-700 lg:mx-0">
                {HERO_SUBHEAD}
              </p>
              <p className="mt-4 text-base text-gray-700 lg:text-[17px]">
                Questions? Text or call{' '}
                <a href="tel:+17373719700" className="font-semibold text-brand-blue underline">
                  (737) 371-9700
                </a>
                .
              </p>

              <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Chip
                  label="Sun, Jul 12"
                  icon={
                    <svg {...iconProps}>
                      <rect x="3" y="4" width="18" height="17" rx="2" />
                      <path d="M16 2v4M8 2v4M3 9h18" />
                    </svg>
                  }
                />
                <Chip
                  label="Boarding 11 AM"
                  icon={
                    <svg {...iconProps}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  }
                />
                <Chip
                  label="Lake Travis"
                  icon={
                    <svg {...iconProps}>
                      <circle cx="12" cy="5" r="2.4" />
                      <path d="M12 8v12M5 12a7 7 0 0 0 14 0M5 12H3m16 0h2" />
                    </svg>
                  }
                />
              </div>

              <div className="mt-9 flex flex-col items-center gap-3.5 lg:items-start">
                <OrderButton label="Start Your Order" />
                <span className="text-sm text-gray-500">Free delivery straight to your boat.</span>
              </div>
            </div>

            {/* Hero media — cowgirl with cocktails on the boat. Source
                image should be dropped at
                /public/images/events/buckarodeo-cowgirl.jpg. Uses
                next/image + priority=true so it lands in the LCP. */}
            <div className="w-full">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(11,31,51,0.22)] sm:aspect-video">
                <Image
                  src="/images/events/buckarodeo-cowgirl.jpg"
                  alt="Cowgirl with cocktails on the boat, ready for the Buckarodeo on Lake Travis"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Marquee ===== */}
      <Marquee />

      {/* ===== How It Works ===== */}
      <section className="relative overflow-hidden bg-white px-6 py-[clamp(56px,8vw,96px)]">
        <TexasBackdrop tone="light" idKey="how" />
        <div className="relative z-[1] mx-auto max-w-[1180px]">
          <SectionHead eyebrow="How It Works" title="One Tap, One Cooler." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3 rounded-xl bg-cream p-8">
                <span className="font-heading text-lg font-bold tracking-[0.1em] text-brand-blue">
                  {s.n}
                </span>
                <h3 className="font-heading text-[23px] font-bold uppercase tracking-[0.04em] text-gray-900">
                  {s.h}
                </h3>
                <p className="text-[15px] leading-relaxed text-gray-700">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== The Details ===== */}
      <section className="relative overflow-hidden bg-gray-50 px-6 py-[clamp(56px,8vw,96px)]">
        <TexasBackdrop tone="light" idKey="details" />
        <div className="relative z-[1] mx-auto max-w-[1180px]">
          <SectionHead eyebrow="The Details" title="Everything You Need to Know." />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {DETAILS.map((d) => (
              <div
                key={d.n}
                className="flex items-start gap-5 rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
              >
                <span className="font-fraunces text-[40px] font-medium italic leading-none text-brand-blue">
                  {d.n}
                </span>
                <div>
                  <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-brand-blue">
                    {d.label}
                  </p>
                  <p className="mt-2 text-[17px] leading-snug text-gray-900">
                    {d.main}
                    <br />
                    <span className="text-[15px] text-gray-500">{d.sub}</span>
                  </p>
                  {d.map && (
                    <a
                      href={MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 font-heading text-[13px] font-bold uppercase tracking-[0.08em] text-brand-blue"
                    >
                      <svg {...iconProps} width={15} height={15}>
                        <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
                        <circle cx="12" cy="10" r="2.3" />
                      </svg>
                      Open in Maps
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Crowd-Pleasers (inline solo-cart shop) ===== */}
      <section className="relative overflow-hidden bg-white px-6 py-[clamp(56px,8vw,96px)]">
        <TexasBackdrop tone="light" idKey="shop" />
        <div className="relative z-[1] mx-auto max-w-[1180px]">
          <SectionHead eyebrow="Crowd-Pleasers" title="Stock the Cooler." />
          <CoolerShop products={crowdPleasers} />
        </div>
      </section>

      {/* ===== Closing CTA band ===== */}
      <section
        className="relative overflow-hidden px-6 py-[clamp(64px,9vw,110px)] text-center"
        style={{
          background:
            'radial-gradient(120% 130% at 50% 0%, rgba(242,211,79,0.30), transparent 58%), linear-gradient(180deg, #0B74B8 0%, #085286 100%)',
        }}
      >
        <TexasBackdrop tone="dark" idKey="cta" />
        <div className="relative z-[1] mx-auto max-w-[760px]">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow">
            ◆ Saddle Up ◆
          </p>
          <h2 className="mt-4 font-heading text-5xl font-bold uppercase leading-[0.98] tracking-[0.08em] text-white md:text-6xl lg:text-7xl">
            Ready to Ride?
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-lg leading-relaxed text-white/80">
            {CTA_SUBHEAD}
          </p>
          <div className="mt-8">
            <OrderButton label="Start Your Order" />
          </div>
          <p className="mt-4 text-sm text-white/60">
            Free delivery · Order by Saturday, July 11 · 21+
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative overflow-hidden bg-white px-6 py-[clamp(56px,8vw,96px)]">
        <TexasBackdrop tone="light" idKey="faq" />
        <div className="relative z-[1] mx-auto max-w-[820px]">
          <SectionHead eyebrow="FAQ" title="Good Questions." />
          <Faq />
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="relative overflow-hidden bg-navy px-6 pb-10 pt-14 text-center">
        <TexasBackdrop tone="dark" idKey="footer" />
        <div className="relative z-[1] mx-auto max-w-[1180px]">
          <p className="font-heading text-[22px] font-bold uppercase tracking-[0.12em] text-white">
            Buckarodeo
          </p>
          <p className="mt-1.5 font-fraunces text-[17px] font-medium italic text-gold">
            Party On Delivery × Premier Party Cruises
          </p>
          <p className="mt-6 text-sm text-gray-300">
            <a href="mailto:info@partyondelivery.com" className="text-gray-300 hover:text-white">
              info@partyondelivery.com
            </a>
          </p>
          <p className="mt-1.5 text-[13px] text-gray-500">
            © 2026 Party On Delivery LLC · Austin, TX · TABC Licensed · Drink responsibly · Must be
            21+
          </p>
        </div>
      </footer>
    </main>
  );
}
