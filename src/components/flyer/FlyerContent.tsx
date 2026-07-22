'use client';

/**
 * THE PARTY ON DELIVERY PLAYBOOK
 *
 * Stand-alone luxury flyer at /flyer. Doubles as:
 *   1. A real marketing page (SEO + paid traffic landing)
 *   2. A printable PDF (browser print → save as PDF) using the
 *      print stylesheet hidden in <style jsx global> below
 *   3. The "preview" content surfaced by the lead-magnet modal
 *      (which deep-links here after the user submits)
 *
 * Visual language matches the new landing pages: navy + gold, Barlow
 * Condensed display type, Inter body, big editorial photography.
 */
import { useState } from 'react';
import Image from 'next/image';

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const GOLD_HOVER = '#B8951F';
const CREAM = '#FAF7F2';

type Service = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  image: string;
  highlight?: string; // headline price/figure on the right
};

const SERVICES: Service[] = [
  {
    eyebrow: '01 · ALCOHOL DELIVERY',
    title: 'Beer, liquor, mixers — at your door, ice-cold.',
    body:
      'TABC-licensed alcohol delivery across the greater Austin area. Same-day windows, 48-hour guaranteed pricing, cold packs on every order. From a backyard six-pack to a 200-person open bar — we move the truck so you don\'t have to.',
    bullets: [
      '500+ Austin parties delivered',
      'Same-day & scheduled windows',
      'Bottled, canned, draft, kegs',
    ],
    image: '/images/services/bach-parties/late-night-party-supplies.webp',
    highlight: '$0 delivery on orders 4+ packs',
  },
  {
    eyebrow: '02 · PARTY RENTALS',
    title: 'Tables, chairs, glassware, dispensers.',
    body:
      'Everything you need that isn\'t booze. Curated rental catalog of bar essentials we use ourselves — cold tubs, drink dispensers, glassware kits, cocktail shakers, ice scoops. Show up, pour, party. We pick it back up.',
    bullets: [
      'Drink dispensers + ice tubs',
      'Glassware + barware kits',
      'Pickup included — no return trips',
    ],
    image: '/images/gallery/party-headquarters.webp',
    highlight: 'Pickup + sanitation included',
  },
  {
    eyebrow: '03 · FULL BAR SETUP',
    title: 'Pro bartenders, pop-up bars, full builds.',
    body:
      'White-glove bar service for weddings, corporate events, and high-end parties. TABC-certified bartenders, custom menus, branded cocktails. From a 2-hour cocktail hour to an 8-hour reception — we handle setup, service, and breakdown.',
    bullets: [
      'TABC-certified bartenders',
      'Custom signature-cocktail menus',
      'Setup + service + tear-down',
    ],
    image: '/images/gallery/ai-recommended-setup.webp',
    highlight: 'From $450/bartender · 4-hour min',
  },
  {
    eyebrow: '04 · COCKTAIL KITS — FEAT. FRESH VICTOR',
    title: 'Pre-built kits. Real cocktails. Zero work.',
    body:
      'Our cocktail kits are built around Fresh Victor — the premium cold-pressed mixer used by James Beard award-winning bars. Every kit ships with the exact bottle, mixer ratio, ice, and garnish — so your guests sip the same drink whether they\'re in a hotel room or a Lake Travis pontoon.',
    bullets: [
      'Made with Fresh Victor cold-pressed mixers',
      'Premium spirits curated per kit',
      'Pre-portioned — pour, shake, serve',
    ],
    image: '/images/products/fresh-victor-cocktails/cocktail-kits-grid.png',
    highlight: '12 signature kits · $89–$249',
  },
  {
    eyebrow: '05 · CONCIERGE',
    title: 'White-glove event planning, end-to-end.',
    body:
      'For groups that want it handled. We coordinate venue, drinks, rentals, bartenders, food vendor introductions, and day-of logistics. One contact, one invoice, zero juggling. Best for bachelor / bachelorette weekends, corporate retreats, and milestone birthdays.',
    bullets: [
      'Single point of contact, 7 days/week',
      'Vendor coordination + day-of timeline',
      'Optional luxury upgrades (boats, ranches, suites)',
    ],
    image: '/images/hero/bach-hero-rainey.webp',
    highlight: 'From $1,500 retainer',
  },
];

// Actual cocktail visuals (Gemini-generated drink photography) — NOT the
// raw Fresh Victor mixer bottles. One AI-generated cocktail image per kit.
const COCKTAIL_KITS = [
  {
    name: 'Lake Travis Ranch Water',
    profile: 'Tequila · Lime · Soda',
    image:
      '/images/products/fresh-victor-cocktails/Lake Travis Ranch Water/Gemini_Generated_Image_8hxllx8hxllx8hxl.png',
  },
  {
    name: 'Keep Austin Spicy Marg',
    profile: 'Jalapeño · Tequila · Lime',
    image:
      '/images/products/fresh-victor-cocktails/Keep Austin Spicy Marg/Gemini_Generated_Image_bm1s1dbm1s1dbm1s.png',
  },
  {
    name: 'Cucumber Crush Margarita',
    profile: 'Tequila · Cucumber · Mint',
    image:
      '/images/products/fresh-victor-cocktails/Cucumber Crush Margarita/Gemini_Generated_Image_9t92hz9t92hz9t92.png',
  },
  {
    name: 'Lady Bird Margarita',
    profile: 'Tequila · Strawberry · Lime',
    image:
      '/images/products/fresh-victor-cocktails/Lady Bird Margarita/Gemini_Generated_Image_95mqfa95mqfa95mq.png',
  },
  {
    name: 'Eastside Gin & Tonic',
    profile: 'Gin · Cucumber · Tonic',
    image:
      '/images/products/fresh-victor-cocktails/Eastside Gin and Tonic/Gemini_Generated_Image_jlrbq6jlrbq6jlrb.png',
  },
  {
    name: 'Barton Springs Mojito',
    profile: 'Rum · Mint · Lime',
    image:
      '/images/products/fresh-victor-cocktails/Barton Springs Mojito/Gemini_Generated_Image_4u61bg4u61bg4u61.png',
  },
];

export default function FlyerContent() {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  };

  return (
    <div className="flyer-root" style={{ background: CREAM, color: NAVY }}>
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .flyer-no-print { display: none !important; }
          .flyer-root { background: white !important; }
          .flyer-section { page-break-inside: avoid; }
        }
      `}</style>

      {/* HERO */}
      <section
        className="relative overflow-hidden flyer-section"
        style={{ background: NAVY, color: '#FFFFFF' }}
      >
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/images/services/bach-parties/bachelor-party-epic.webp"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,15,25,0.45) 0%, rgba(10,15,25,0.92) 100%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-12 md:pb-20">
          <div
            className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest mb-5"
            style={{ background: GOLD, color: NAVY }}
          >
            THE PLAYBOOK · AUSTIN · 2026
          </div>
          <h1
            className="font-heading font-bold leading-[0.95] tracking-tight mb-4"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
          >
            Five services.
            <br />
            <span style={{ color: GOLD }}>One party engine.</span>
          </h1>
          <ul className="max-w-2xl space-y-2 mb-5 text-sm md:text-base">
            <SubheadBullet
              title="Alcohol delivery"
              body="TABC-licensed. Ice-cold, on time, to your door."
            />
            <SubheadBullet
              title="Party rentals"
              body="Tubs, dispensers, glassware, barware — pickup included."
            />
            <SubheadBullet
              title="Full bar setup"
              body="Pro bartenders, custom menus, end-to-end service."
            />
            <SubheadBullet
              title="Fresh Victor cocktail kits"
              body="Pre-portioned signature cocktails, ready to pour."
            />
            <SubheadBullet
              title="Concierge planning"
              body="One contact, every vendor, day-of timeline included."
            />
          </ul>
          <p
            className="max-w-2xl text-sm md:text-base opacity-85 leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic' }}
          >
            500+ Austin events under our belt — from Rainey-Street bachelorette weekends
            to 300-guest weddings on the Hill Country. This is the playbook we use to
            pull them off.
          </p>
          <div className="flyer-no-print flex flex-wrap gap-3 mt-6">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="px-6 py-3.5 rounded-md font-bold text-sm tracking-widest transition-transform hover:scale-[1.02]"
              style={{ background: GOLD, color: NAVY }}
            >
              {printing ? 'OPENING PRINT…' : '⤓ DOWNLOAD AS PDF'}
            </button>
            <a
              href="tel:7373719700"
              className="px-6 py-3.5 rounded-md font-bold text-sm tracking-widest border-2 transition-colors hover:bg-white/10"
              style={{ borderColor: '#FFFFFF55', color: '#FFFFFF' }}
            >
              📞 (737) 371-9700
            </a>
          </div>
          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            <Stat n="500+" label="Austin events served" />
            <Stat n="12" label="Cocktail kits in rotation" />
            <Stat n="100%" label="TABC licensed + insured" />
            <Stat n="$0" label="Delivery fee on 4+ packs" />
          </div>
        </div>
      </section>

      {/* SERVICE SECTIONS */}
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-16 space-y-12 md:space-y-20">
        {SERVICES.map((s, i) => (
          <ServiceBlock key={s.eyebrow} service={s} flipped={i % 2 === 1} />
        ))}

        {/* COCKTAIL KIT GRID */}
        <section className="flyer-section">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div
              className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-3"
              style={{ background: NAVY, color: GOLD }}
            >
              SIGNATURE COCKTAIL KITS
            </div>
            <h2
              className="font-heading font-bold leading-tight tracking-wide mb-3"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', color: NAVY }}
            >
              Six of the twelve.
            </h2>
            <p
              className="text-base md:text-lg opacity-80 leading-relaxed"
              style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic' }}
            >
              Every kit is built around a Fresh Victor cold-pressed mixer, paired with a
              hand-picked premium spirit. Pre-portioned for 8–10 servings. Pour, shake,
              done.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {COCKTAIL_KITS.map((k) => (
              <KitCard key={k.name} kit={k} />
            ))}
          </div>
          <p className="text-center text-xs mt-6 opacity-60" style={{ color: NAVY }}>
            Plus 6 more · From $89 / kit · See the full lineup at partyondelivery.com
          </p>
        </section>

        {/* FRESH VICTOR CALLOUT */}
        <section
          className="rounded-2xl overflow-hidden flyer-section grid md:grid-cols-2"
          style={{ background: NAVY, color: '#FFFFFF' }}
        >
          <div className="p-8 md:p-12">
            <div
              className="text-[10px] font-bold tracking-widest mb-3"
              style={{ color: GOLD }}
            >
              WHY FRESH VICTOR
            </div>
            <h3
              className="font-heading font-bold leading-tight tracking-wide mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
            >
              The mixer the best bars in America already pour.
            </h3>
            <p className="text-sm md:text-base opacity-90 leading-relaxed mb-4">
              Fresh Victor presses real fruit cold — no concentrate, no high-fructose,
              no artificial sweetener. The same brand used by Death &amp; Co., Pouring
              Ribbons, and James Beard-winning bars from Brooklyn to Los Angeles. We
              build our kits around it because it&apos;s the closest you&apos;ll get to
              a craft-bar cocktail without a bartender.
            </p>
            <ul className="text-sm space-y-1 opacity-90">
              <li>• Cold-pressed, never from concentrate</li>
              <li>• Cane-sugar sweetened (no HFCS)</li>
              <li>• Gluten-free, vegan, kosher</li>
              <li>• Used at 1,500+ premium bars nationwide</li>
            </ul>
          </div>
          <div className="relative min-h-[260px] md:min-h-full">
            <Image
              src="/images/partners/vacation-rental-hero/signature-cocktail-bar-spread-austin.jpg"
              alt="Signature cocktail bar setup — Austin"
              fill
              className="object-cover"
              sizes="(min-width:768px) 50vw, 100vw"
            />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="flyer-section">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div
              className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-3"
              style={{ background: GOLD, color: NAVY }}
            >
              HOW IT WORKS
            </div>
            <h2
              className="font-heading font-bold leading-tight tracking-wide"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', color: NAVY }}
            >
              Three steps. Then enjoy your party.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                n: '01',
                t: 'Tell us the party',
                b: 'Date, headcount, vibe. We send back a quote in under 24 hours.',
              },
              {
                n: '02',
                t: 'Lock it in',
                b: 'Approve the quote, pay your deposit, pick your delivery window.',
              },
              {
                n: '03',
                t: 'Show up ready',
                b: 'We deliver cold, set up if booked, then disappear until pickup.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-xl p-6 md:p-7 transition-shadow hover:shadow-lg"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
              >
                <div
                  className="font-heading text-3xl font-bold mb-2"
                  style={{ color: GOLD }}
                >
                  {s.n}
                </div>
                <h4 className="font-heading text-lg font-bold mb-2" style={{ color: NAVY }}>
                  {s.t}
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FINAL CTA */}
      <section
        className="flyer-section py-14 md:py-20 px-6 md:px-10"
        style={{
          background:
            `linear-gradient(135deg, ${NAVY} 0%, #1A2F47 100%)`,
          color: '#FFFFFF',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-4"
            style={{ background: GOLD, color: NAVY }}
          >
            BOOK A 10-MIN PLANNING CALL
          </div>
          <h2
            className="font-heading font-bold leading-tight tracking-wide mb-3"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
          >
            Let&apos;s build your party.
          </h2>
          <p
            className="text-lg opacity-90 mb-7 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic' }}
          >
            One conversation. We&apos;ll map out drinks, rentals, and timing — and quote
            it before you hang up.
          </p>
          <div className="flyer-no-print flex flex-wrap gap-3 justify-center">
            <a
              href="https://123.partyondelivery.com/planning-call"
              target="_blank"
              rel="noreferrer"
              className="px-7 py-4 rounded-md font-bold text-sm tracking-widest transition-transform hover:scale-[1.02]"
              style={{ background: GOLD, color: NAVY }}
            >
              SCHEDULE A 10-MIN CALL →
            </a>
            <a
              href="tel:7373719700"
              className="px-7 py-4 rounded-md font-bold text-sm tracking-widest border-2 hover:bg-white/10"
              style={{ borderColor: '#FFFFFF55', color: '#FFFFFF' }}
            >
              CALL (737) 371-9700
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="flyer-section py-8 px-6 md:px-10 text-center text-xs"
        style={{ background: '#000', color: '#FFFFFF', borderTop: `2px solid ${GOLD}` }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="font-heading text-xl font-bold tracking-wider mb-2"
            style={{ color: GOLD }}
          >
            PARTY ON DELIVERY
          </div>
          <div className="opacity-80">
            TABC-Licensed Alcohol Retailer · Austin, TX · partyondelivery.com · (737)
            371-9700
          </div>
          <div className="opacity-60 mt-1">
            © 2026 Party On Delivery. Must be 21+ at delivery. Drink responsibly.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ServiceBlock({ service, flipped }: { service: Service; flipped: boolean }) {
  return (
    <section
      className={`flyer-section grid md:grid-cols-2 gap-6 md:gap-12 items-center ${
        flipped ? 'md:[direction:rtl]' : ''
      }`}
    >
      <div
        className={`relative rounded-2xl overflow-hidden ${flipped ? 'md:[direction:ltr]' : ''}`}
        style={{ aspectRatio: '4/3', boxShadow: `0 12px 40px rgba(10,15,25,0.18)` }}
      >
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover"
          sizes="(min-width:768px) 50vw, 100vw"
        />
        {service.highlight && (
          <div
            className="absolute bottom-3 left-3 right-3 rounded-md px-3 py-2 text-xs font-bold tracking-wider text-center backdrop-blur"
            style={{ background: 'rgba(212,175,55,0.92)', color: NAVY }}
          >
            {service.highlight.toUpperCase()}
          </div>
        )}
      </div>
      <div className={flipped ? 'md:[direction:ltr]' : ''}>
        <div
          className="text-[10px] font-bold tracking-widest mb-2"
          style={{ color: GOLD_HOVER }}
        >
          {service.eyebrow}
        </div>
        <h3
          className="font-heading font-bold leading-tight tracking-wide mb-3"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', color: NAVY }}
        >
          {service.title}
        </h3>
        <p className="text-base text-gray-800 leading-relaxed mb-4">{service.body}</p>
        <ul className="space-y-1">
          {service.bullets.map((b) => (
            <li key={b} className="flex gap-2 items-start text-sm text-gray-800">
              <span style={{ color: GOLD_HOVER }}>✦</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function KitCard({ kit }: { kit: { name: string; profile: string; image: string } }) {
  return (
    <div
      className="rounded-xl bg-white overflow-hidden transition-shadow hover:shadow-lg"
      style={{ border: '1px solid #E5E7EB' }}
    >
      {/* Full-bleed cocktail photo — these are actual drink visuals, not
          bottle product shots, so object-cover frames them nicely. */}
      <div
        className="relative bg-gray-100"
        style={{ aspectRatio: '4/3' }}
      >
        <Image
          src={encodeURI(kit.image)}
          alt={kit.name}
          fill
          className="object-cover"
          sizes="(min-width:768px) 25vw, 50vw"
        />
      </div>
      <div className="p-3 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div
          className="font-heading text-sm font-bold tracking-wide leading-tight"
          style={{ color: NAVY }}
        >
          {kit.name}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5 tracking-wide">{kit.profile}</div>
      </div>
    </div>
  );
}

function SubheadBullet({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-2.5 items-start leading-snug">
      <span
        className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full"
        style={{ background: GOLD }}
      />
      <span>
        <strong className="font-bold" style={{ color: GOLD }}>
          {title}
        </strong>{' '}
        <span className="opacity-90">— {body}</span>
      </span>
    </li>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div
      className="rounded-md px-3 py-2 backdrop-blur"
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(212,175,55,0.35)' }}
    >
      <div className="font-heading text-2xl md:text-3xl font-bold leading-none" style={{ color: GOLD }}>
        {n}
      </div>
      <div className="text-[10px] uppercase tracking-widest opacity-80 mt-1">{label}</div>
    </div>
  );
}
