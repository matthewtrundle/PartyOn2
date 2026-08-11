import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import type { CategoryTemplateProps } from './template-types';
import VideoFacade from '@/components/VideoFacade';

type BoatTemplateProps = CategoryTemplateProps & {
  /** Override the default "Free Drink Delivery for {business}" H1 (co-branded partner headline). */
  headline?: ReactNode;
  /** Override the default hero subhead. */
  subhead?: ReactNode;
  /** Where every CTA button points. Defaults to /order; partners deep-link to /order?ref=CODE&p=boat&d=boat. */
  ctaHref?: string;
  /** Full-bleed hero background image. Defaults to the shared PoD boat hero. */
  heroBackgroundImage?: string;
  /**
   * Optional partner video. When supplied it takes over the hero's media slot,
   * replacing `partnerHeroImage` — the video sits beside the headline and CTA on
   * desktop and stacks below them on mobile.
   *
   * This is NOT the silent looping hero background (see PartnerHeroVideo) — it
   * is a real player with sound and controls, for a narrated partner spot that
   * someone is meant to sit and watch. It mounts click-to-play (VideoFacade) so
   * a third-party iframe never loads in the hero unasked.
   *
   * No VideoObject JSON-LD is emitted on purpose. These partner spots are
   * post-booking utility videos with no search job (they play here, in booking
   * confirmations, and in the text a partner sends), so they are hosted
   * unlisted and are not competing for video rich results.
   *
   * Omit the whole object and the hero falls back to the still image.
   */
  video?: {
    /** YouTube video ID only — not the full URL. Works for Shorts too. */
    videoId: string;
    /** Used for the iframe title and screen readers. */
    title: string;
    /** Local poster still under /public/images, shown until someone clicks play. */
    posterImage: string;
    /** Shape of the footage. Vertical renders a clamped 9:16 player. */
    orientation?: 'landscape' | 'vertical';
  };
};

const BOAT_TESTIMONIALS = [
  {
    reviewer: 'Kirby P.',
    text: 'Must do if going on a boat party in Austin. Had all our drinks iced and waiting at the dock. No hauling coolers from the car, no last-minute liquor store runs. Just showed up and stepped on board.',
  },
  {
    reviewer: 'Chop C.',
    text: 'Working with Party On Delivery for our 50 person boat party was incredible. They coordinated the delivery timing perfectly with our departure and had everything organized by drink type. Made the whole event seamless.',
  },
  {
    reviewer: 'Jake M.',
    text: 'Pulled up to the marina and everything was already at my slip. Coolers packed, ice fresh, cups and all. We just loaded the boat and took off. Best decision we made for the trip.',
  },
  {
    reviewer: 'Sarah & Chris T.',
    text: 'We had six couples going out on the boat and everyone wanted something different. The group ordering feature let everyone pick their own drinks and split the bill. One delivery, zero hassle.',
  },
];

const BOAT_FAQ_ITEMS = [
  {
    q: 'When do you deliver to the marina?',
    a: 'We deliver 30-60 minutes before your scheduled departure time. Everything arrives iced, organized, and ready to load onto the boat.',
  },
  {
    q: "What's the ordering deadline?",
    a: 'We recommend placing your order at least 24 hours before your boat trip. Same-day delivery is available for most items, but ordering ahead guarantees full selection.',
  },
  {
    q: 'What do you need from me?',
    a: 'Just your boat name or booking reference, captain name, departure time, and dock/slip location. We handle the rest.',
  },
  {
    q: 'Do you include ice and cups?',
    a: 'Yes! Every delivery comes with plenty of ice and cups at no extra charge. We stock your cooler so you can head straight out on the water.',
  },
  {
    q: 'Can our group split the order?',
    a: 'Absolutely. Start a group order and share the link with everyone on the boat. Each person adds what they want and pays for their own items. One delivery, zero Venmo math.',
  },
  {
    q: 'What about ID requirements?',
    a: 'We are TABC licensed and require a valid government-issued ID for all deliveries. All recipients must be 21 or older.',
  },
];

const BOAT_VALUE_TABLE = [
  { item: 'Free delivery to the marina', value: 'Up to $100' },
  { item: 'Group ordering with split payments', value: 'FREE' },
  { item: 'Delivery timed with your boat schedule', value: 'Included' },
  { item: 'Cocktail kits perfect for the boat available', value: 'On request' },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-brand-yellow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

// `partnerLogo` is intentionally not destructured: the hero no longer renders a
// partner logo chip. The LTYR logo asset is a square social-media badge with its
// own border and baked-in text, so chipped or un-chipped it read as a box inside
// a box (removed 2026-08-11). The prop stays in the shared CategoryTemplateProps
// for the other templates — if a partner ever supplies a transparent wordmark,
// bring the logo back rather than restyling the badge.
export function BoatTemplate({ affiliate, partnerHeroImage, headline, subhead, ctaHref, heroBackgroundImage, video }: BoatTemplateProps) {
  const { businessName } = affiliate;
  const heroImage = partnerHeroImage || '/images/boat-heroes/boat-party-epic-sunset.webp';
  const heroBg = heroBackgroundImage || '/images/boat-heroes/boat-party-epic-sunset.webp';
  const cta = ctaHref ?? '/order';

  return (
    <div className="bg-white min-h-screen">
      <Navigation hidden />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <Image
          src={heroBg}
          alt={`${businessName} x Party On Delivery - boat party on the lake`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-900/50" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-28 pb-16 md:pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
            <div className="order-1 text-center">
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-white mb-4 tracking-wide leading-tight">
                {headline ?? (
                  <>
                    <span className="text-brand-yellow">Free Drink Delivery</span> for {businessName} Customers
                  </>
                )}
              </h1>
              <p className="text-gray-300 text-lg md:text-xl mb-8">
                {subhead ?? <>Book {businessName}. Get drinks delivered right to the dock.</>}
              </p>

              <div className="mb-8">
                <Link
                  href={cta}
                  className="inline-block h-14 md:h-16 px-10 bg-yellow-500 hover:bg-brand-yellow text-gray-900 font-semibold tracking-wide transition-colors rounded-lg text-lg md:text-xl leading-[3.5rem] md:leading-[4rem]"
                >
                  Start Your Order
                </Link>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-white/40 text-xs uppercase tracking-[0.12em]">Provided by</span>
                <Image
                  src="/images/pod-logo-2025.png"
                  alt="Party On Delivery"
                  width={360}
                  height={360}
                  className="h-32 md:h-40 w-auto object-contain"
                />
              </div>
            </div>

            <div className="order-2 flex flex-col gap-5">
              {/* The video, when a partner has one, owns this slot instead of the
                  still. Vertical footage is clamped to 320px rather than filling
                  the column: at full column width a 9:16 player runs ~970px tall
                  and would leave the headline and CTA floating in dead space. */}
              {video ? (
                <VideoFacade
                  videoId={video.videoId}
                  title={video.title}
                  posterImage={video.posterImage}
                  aspectRatio={video.orientation === 'vertical' ? '9/16' : '16/9'}
                  maxWidthClass={
                    video.orientation === 'vertical' ? 'max-w-[320px] mx-auto' : undefined
                  }
                  sizes={
                    video.orientation === 'vertical'
                      ? '320px'
                      : '(max-width: 768px) 100vw, 50vw'
                  }
                />
              ) : (
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-white/10">
                  <Image
                    src={heroImage}
                    alt={`${businessName} - Party On Delivery`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/60">
                <span className="flex items-center gap-1.5">
                  <CheckIcon />
                  Free Delivery to Marina
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon />
                  TABC Licensed
                </span>
                <span className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <div className="text-center mb-10">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-2">
              How It Works
            </p>
            <h2 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-wide">
              Your Boat Party Handled in Three Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Book Your Boat',
                desc: `Reserve your boat through ${businessName}.`,
              },
              {
                step: '2',
                title: 'Order Your Drinks',
                desc: 'Use Party On to order spirits, mixers, seltzers, ice, and cups. We deliver directly to the marina.',
              },
              {
                step: '3',
                title: 'Party On',
                desc: 'Step aboard with everything you need -- just enjoy the water.',
              },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                <div className="w-10 h-10 bg-brand-blue text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-heading text-lg text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href={cta}
              className="inline-block px-8 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              Order Your Drinks
            </Link>
            <p className="text-gray-500 text-sm mt-4">
              Questions? Text{' '}
              <a href="tel:7373719700" className="text-brand-blue font-medium">
                737-371-9700
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* VALUE TABLE */}
      <section className="bg-white py-12 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-2">
              Your Drinks, Handled
            </p>
            <h2 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-wide">
              Every Party On Order Includes
            </h2>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="space-y-4">
              {BOAT_VALUE_TABLE.map((row, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0"
                >
                  <span className="flex items-center gap-3 text-gray-900 text-base">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {row.item}
                  </span>
                  <span className="text-gray-900 font-semibold text-base whitespace-nowrap ml-4">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative py-16 px-6 md:px-12 bg-gray-100 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-3">
              Real Reviews
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-wide">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {BOAT_TESTIMONIALS.map((review, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">&quot;{review.text}&quot;</p>
                <p className="font-medium text-gray-900">&mdash; {review.reviewer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-20 px-6 md:px-12 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 lg:gap-12 items-center justify-center">
            <div className="flex justify-center">
              <div className="relative w-48 md:w-56 rounded-2xl overflow-hidden bg-gray-800 shadow-2xl aspect-[9/16]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                >
                  <source src="/videos/trust-section.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            <div className="flex flex-col text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <Image
                  src="/images/pod-logo-2025.svg"
                  alt="Party On Delivery"
                  width={180}
                  height={180}
                  className="w-32 h-32 md:w-44 md:h-44"
                />
              </div>

              <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-6">
                Austin-Born. Fully Licensed. Always On Time.
              </h2>

              <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
                Howdy! We&apos;re Allan and Brian, owners of Party On Delivery. Austin natives with 15+ years in events and hospitality, we built this business around one thing: taking care of people. We pride ourselves on clear communication, on-time delivery, and showing people the best of our great city. Our goal is simple - make your weekend easy, safe, and fun.
              </p>
              <p className="text-brand-yellow text-xl md:text-2xl font-heading mt-6 tracking-wide">
                PARTY ON Y&apos;ALL
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-500 tracking-[0.1em] uppercase text-sm mb-3">
              Got Questions?
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-wide">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {BOAT_FAQ_ITEMS.map((faq, idx) => (
              <details key={idx} className="border border-gray-200 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                  <span className="font-semibold text-gray-900 text-base pr-4">{faq.q}</span>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-4">
                  <p className="text-gray-600 text-base leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 px-6 md:px-12 bg-gradient-to-br from-yellow-500 to-brand-yellow">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-wide">
            Ready to Order?
          </h2>
          <p className="text-gray-800 text-lg mb-8 max-w-2xl mx-auto">
            Book the boat. We handle the drinks.
          </p>

          <div className="mb-6">
            <Link
              href={cta}
              className="inline-block px-10 py-4 bg-gray-900 text-white hover:bg-gray-800 font-semibold tracking-wider transition-colors rounded-lg"
            >
              Start Your Order
            </Link>
          </div>

          <p className="text-gray-700">
            Questions? Call us:{' '}
            <a href="tel:7373719700" className="font-semibold underline">
              737.371.9700
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
