import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/database/client';
import { transformToProduct } from '@/lib/products/transform';
import { Product } from '@/lib/types';
import { getProductImageUrl } from '@/lib/utils';
import FireworksCanvas from './FireworksCanvas';
import July4KitCards from './July4KitCards';
import HeroRotator from './HeroRotator';

// Always fresh during the campaign (price/stock can change day to day).
export const dynamic = 'force-dynamic';

// --- Single-source launch values (swap before go-live) ---
const ORDER_BY = 'July 2';
const PHONE_DISPLAY = '(512) 555-0142'; // TODO: real number before launch
const PHONE_HREF = '+15125550142'; // TODO: real number before launch
const TABC_LICENSE = '[TABC License #]'; // TODO: real license # before launch

// Red → True Blue (center, featured) → Coconut Punch
const TRIO_HANDLES = [
  'strawberry-lemonade-vodka-kit-serves-16',
  'blue-margarita-kit-serves-16',
  'coconut-colada-kit-serves-16',
];

const ZONES = ['Austin', 'Cedar Park', 'Westlake', 'Bee Cave', 'Lakeway', 'Lake Travis'];

// Hero rotator: accent per kit + a fallback set if the kits aren't fetched.
const KIT_ACCENT: Record<string, string> = {
  'strawberry-lemonade-vodka-kit-serves-16': '#C8102E',
  'blue-margarita-kit-serves-16': '#0B74B8',
  'coconut-colada-kit-serves-16': '#E8EDF2',
};
const DEFAULT_HERO_SLIDES = [
  { label: "Rocket's Red Glare Strawberry Lemonade", src: '', accent: '#C8102E' },
  { label: 'True Blue Margarita', src: '', accent: '#0B74B8' },
  { label: 'Star-Spangled Coconut Punch', src: '', accent: '#E8EDF2' },
];

const FAQS = [
  {
    q: 'Do you deliver alcohol for the 4th of July in Austin?',
    a: 'Yes. We deliver pre-batched cocktail kits across the Austin area — including Cedar Park, Westlake, Bee Cave, Lakeway, and Lake Travis. Order ahead and choose your delivery date, including July 4th itself.',
  },
  {
    q: 'What areas do you deliver to?',
    a: "Austin, Cedar Park, Westlake, Bee Cave, Lakeway, and Lake Travis. Not sure if you're in range? Add a kit to your cart and we'll confirm coverage for your address before you pay.",
  },
  {
    q: 'How far ahead should I order?',
    a: `Reserve by ${ORDER_BY} to lock in 4th of July delivery — holiday windows fill up fast, so earlier is always safer.`,
  },
  {
    q: 'How many does each kit serve?',
    a: 'Every kit is pre-batched in a 1.2-gallon dispenser and serves about 16 drinks. Just add ice and pour.',
  },
];

const STEPS = [
  { n: 1, t: 'Pick Your Kits', b: 'Choose one, two, or all three. Each makes 16 drinks in a dispenser.' },
  { n: 2, t: 'Lock Your Delivery', b: `Pick your address and date — including July 4th. We confirm coverage before you pay. Reserve by ${ORDER_BY}.` },
  { n: 3, t: 'Just Add Ice', b: 'We deliver everything pre-batched and cold. Pour, sip, celebrate.' },
];

const GROUP_STEPS = [
  { n: 1, t: 'Start a Group Tab', b: 'Create a group order in seconds and get a shareable link — no account needed.' },
  { n: 2, t: 'Share the Link', b: 'Drop it in your group chat. Everyone adds their own drinks to the same tab.' },
  { n: 3, t: 'One Delivery', b: 'We bring the whole party order together, ice-cold, to your door on the 4th.' },
];

export const metadata: Metadata = {
  title: '4th of July Drink Delivery in Austin, TX | Party On Delivery',
  description:
    'Festive 4th of July cocktail kits delivered across Austin. Each serves 16 with a dispenser — just add ice. Order ahead for cookouts, parties & celebrations. Reserve by July 2.',
  keywords:
    '4th of july drink delivery austin, fourth of july alcohol delivery austin, july 4th cocktail delivery austin, 4th of july party drinks austin',
  alternates: { canonical: '/austin-4th-of-july-delivery' },
  openGraph: {
    title: '4th of July Cocktails, Delivered in Austin',
    description: 'Pre-batched red, white & blue cocktail kits delivered across Austin. Each serves 16. Reserve by July 2.',
    url: 'https://partyondelivery.com/austin-4th-of-july-delivery',
    images: ['/images/og-4th-of-july.jpg'],
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default async function Austin4thOfJulyDeliveryPage() {
  const rows = await prisma.product.findMany({
    where: { handle: { in: TRIO_HANDLES }, status: 'ACTIVE' },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { include: { image: true }, orderBy: { createdAt: 'asc' } },
      categories: { include: { category: true } },
    },
  });

  // Keep the Red → True Blue → Coconut Punch display order.
  const kits: Product[] = [];
  for (const handle of TRIO_HANDLES) {
    const row = rows.find((r) => r.handle === handle);
    if (row) kits.push(transformToProduct(row));
  }

  // Hero image rotator pulls from the kit product images (single source — shows
  // branded placeholders until the kit photos are wired onto the products).
  const heroSlides = kits.length
    ? kits.map((k) => ({ label: k.title.replace(' • Serves 16', ''), src: getProductImageUrl(k) || '', accent: KIT_ACCENT[k.handle] || '#0B74B8' }))
    : DEFAULT_HERO_SLIDES;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Party On Delivery',
    description: '4th of July cocktail kit and alcohol delivery across the Austin, TX area.',
    url: 'https://partyondelivery.com/austin-4th-of-july-delivery',
    telephone: PHONE_HREF,
    areaServed: ZONES.map((z) => ({ '@type': 'City', name: z })),
    address: { '@type': 'PostalAddress', addressLocality: 'Austin', addressRegion: 'TX', addressCountry: 'US' },
  };

  return (
    <>
      {/* z-0 — fixed navy night-sky backdrop */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #1f5288 0%, #143f68 55%, #0d2a47 100%)' }}
      />
      {/* z-10 — fixed fireworks canvas */}
      <FireworksCanvas />

      {/* z-20 — content (transparent sections so the fireworks glow through) */}
      <main className="relative z-20 text-white">
        {/* red/white/blue accent stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-white to-blue-600" />

        {/* HERO */}
        <section className="container-custom pt-40 pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="eyebrow text-sm text-white/70">Austin · Cedar Park · Westlake · Lake Travis</p>
              <h1 className="font-heading mt-4 text-4xl tracking-[0.1em] md:text-5xl lg:text-6xl">
                July 4th Cocktails
                <span className="block text-gold">Delivered in Austin</span>
              </h1>
              <p className="editorial mx-auto mt-5 max-w-xl text-xl text-white/80 lg:mx-0">
                Pre-batched, ice-cold, and ready to pour — delivered to your cookout, backyard, or party across the Austin area.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link href="#kits" className="btn-cart">Shop the Kits</Link>
                <Link href="#how" className="btn border-2 border-white/40 text-white hover:bg-white/10">How It Works</Link>
              </div>
              <p className="mt-6 text-sm text-white/80">
                Reserve by {ORDER_BY} · Serves 16 · Dispenser included · TABC-licensed Austin delivery
              </p>
            </div>
            <div>
              <HeroRotator slides={heroSlides} />
            </div>
          </div>
        </section>

        {/* THE TRIO */}
        <section id="kits" className="container-custom section-padding scroll-mt-28">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-[0.1em] md:text-4xl">The Star-Spangled Trio</h2>
            <span className="rule-yellow mx-auto mt-4" />
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Red, white, and blue — batched, balanced, and ready to pour. Each kit makes 16 drinks.
            </p>
          </div>
          <div className="mt-12">
            {kits.length > 0 ? (
              <July4KitCards kits={kits} />
            ) : (
              <p className="text-center text-white/60">Our July 4th kits are being stocked — check back shortly.</p>
            )}
          </div>
          <div className="mt-12 text-center">
            <Link href="/order" className="btn border-2 border-white/40 text-white hover:bg-white/10">
              See the Full Menu
            </Link>
          </div>
        </section>

        {/* GROUP ORDERING */}
        <section id="group" className="container-custom section-padding scroll-mt-28">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-[0.1em] md:text-4xl">
              Ordering for a Group Party? Use Our Group Ordering System
            </h2>
            <span className="rule-yellow mx-auto mt-4" />
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Hosting a crowd this Fourth? Skip the group-text chaos. Start one shared tab, drop the link in your party
              chat, and let everyone add their own drinks — then it all arrives together, ice-cold, in a single delivery.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 md:grid-cols-3">
            {GROUP_STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold" style={{ background: '#0B74B8' }}>
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-[0.08em]">{s.t}</h3>
                <p className="mt-2 text-white/70">{s.b}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/group/create" className="btn-cart">Start a Group Order</Link>
          </div>
        </section>

        {/* URGENCY BAND */}
        <section className="container-custom my-4">
          <div className="rounded-xl px-6 py-4 text-center" style={{ background: 'rgba(200,16,46,0.88)' }}>
            <p className="font-heading text-lg tracking-[0.06em] md:text-xl">
              Reserve your July 4th delivery window by {ORDER_BY} — they fill fast.{' '}
              <Link href="#kits" className="underline underline-offset-4">Reserve now</Link>
            </p>
          </div>
        </section>

        {/* DELIVERY ZONES */}
        <section id="zones" className="container-custom section-padding scroll-mt-28 text-center">
          <h2 className="font-heading text-3xl tracking-[0.1em] md:text-4xl">Delivered Across Austin</h2>
          <span className="rule-yellow mx-auto mt-4" />
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            From downtown to the lake — pick your address and date at checkout and we&apos;ll confirm coverage before you pay.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {ZONES.map((z) => (
              <span
                key={z}
                className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/90"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {z}
              </span>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="container-custom section-padding scroll-mt-28">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-[0.1em] md:text-4xl">How It Works</h2>
            <span className="rule-yellow mx-auto mt-4" />
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold" style={{ background: '#C8102E' }}>
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-[0.08em]">{s.t}</h3>
                <p className="mt-2 text-white/70">{s.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container-custom section-padding scroll-mt-28">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-[0.1em] md:text-4xl">Questions</h2>
            <span className="rule-yellow mx-auto mt-4" />
          </div>
          <div className="mx-auto mt-8 max-w-3xl divide-y divide-white/10">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg tracking-[0.04em]">
                  {f.q}
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-gold transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 leading-relaxed text-white/75">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="container-custom section-padding text-center">
          <h2 className="font-heading text-3xl tracking-[0.08em] md:text-5xl">Skip the Liquor-Store Line.</h2>
          <p className="editorial mx-auto mt-4 max-w-xl text-xl text-white/80">
            Pre-batched, dispenser included, delivered cold. Reserve your Fourth of July kits today.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="#kits" className="btn-cart">Shop the Kits</Link>
            <a href={`tel:${PHONE_HREF}`} className="btn border-2 border-white/40 text-white hover:bg-white/10">
              Call {PHONE_DISPLAY}
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10">
          <div className="container-custom py-8 text-center text-sm text-white/50">
            <p>Must be 21+ with valid ID at delivery. Please drink responsibly.</p>
            <p className="mt-1">TABC License {TABC_LICENSE} · © Party On Delivery</p>
          </div>
        </footer>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
