import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import AustinWeddingDjSchemas from '@/components/seo/AustinWeddingDjSchemas';
import AustinWeddingDjInquiryForm from '@/components/partners/AustinWeddingDjInquiryForm';
import { austinWeddingDj } from '@/lib/partners/landing-pages';

/**
 * Austin Wedding DJ partner landing page (WS3 of the wedding cluster build).
 *
 * Targets `wedding dj austin` (390 vol, KD 8) + `austin wedding djs` (170 vol, KD 28).
 * Pairs the DJ booking with Party On bar service. Custom page (Option A per plan),
 * modeled on /partners/premier-party-cruises but more compact.
 *
 * Operator TODOs (find with `rg "\[(DJ_|TESTIMONIAL_|COUPLE_|VENUE_|MONTH_YEAR_|DJ_PRICING)" src/`):
 *   - [DJ_NAME]         — replace in this file, landing-pages.ts, schemas
 *   - [DJ_PHOTO]        — replace heroImageUrl in landing-pages.ts + the <Image src> below
 *   - [DJ_BIO]          — replace in landing-pages.ts (faqs[0].answer) + the "About" section below
 *   - [DJ_SAMPLE_VIDEO] — replace heroVideoUrl in landing-pages.ts + the <iframe src> below
 *   - [DJ_PRICING]      — replace with DJ's confirmed starting price in the Bundle Savings block
 *   - [TESTIMONIAL_1/2] — replace with real review copy in the Testimonials section
 *   - [COUPLE_1/2]      — author name for each testimonial
 *   - [VENUE_1/2]       — venue name from each wedding
 *   - [MONTH_YEAR_1/2]  — when each wedding happened
 *   - WEDDING_DJ ref code — replace once the affiliate record exists in /admin/affiliates
 */

const REF_CODE = 'WEDDING_DJ';
// TODO(dj-assets): replace with the real DJ photo path when delivered
const HERO_IMAGE = austinWeddingDj.heroImageUrl ?? '/images/partners/austin-wedding-dj-hero.webp';

export const metadata: Metadata = {
  title: 'Austin Wedding DJ + Bar Service | [DJ_NAME] × Party On Delivery',
  description:
    'Austin wedding DJ paired with TABC-licensed alcohol delivery. Book [DJ_NAME] for ceremony, cocktail hour, and reception — and let Party On stock the bar.',
  alternates: { canonical: '/partners/austin-wedding-dj' },
  openGraph: {
    title: '[DJ_NAME] — Austin Wedding DJ + Party On Bar Service',
    description:
      'Austin wedding DJ paired with TABC-licensed alcohol delivery. One coordinated weekend.',
    images: [HERO_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function AustinWeddingDjPage(): ReactElement {
  const faqs = austinWeddingDj.faqs;

  return (
    <div className="bg-white min-h-screen">
      <AustinWeddingDjSchemas />
      <Navigation hidden />

      {/* HERO */}
      <section className="relative h-[60vh] md:h-[70vh] mt-24 flex items-center justify-center overflow-hidden bg-gray-900">
        {/* TODO(dj-assets): swap to the real DJ photo when delivered */}
        <Image
          src={HERO_IMAGE}
          alt="[DJ_PHOTO] — Austin wedding DJ at a Lake Travis reception"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/70" />
        <div className="relative text-center text-white z-10 max-w-4xl mx-auto px-8">
          {/*
            The keyword phrase ("Austin Wedding DJ + Bar Service") is the
            <h1> so it matches <title>. The DJ name below it is <h2>.
            Visual rendering is unchanged.
          */}
          <h1 className="text-sm font-heading uppercase tracking-[0.1em] text-gold-400 mb-3">
            Austin Wedding DJ + Bar Service
          </h1>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-[0.1em] mb-6">
            [DJ_NAME]
          </h2>
          <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto mb-8">
            Austin wedding DJ for ceremony, cocktail hour, and reception. Bundle with
            Party On bar service for one coordinated wedding weekend.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button variant="cart" size="lg" href="#inquiry">
              Check Availability For Your Date
            </Button>
            <Link
              href={`/order?ref=${REF_CODE}&p=wedding`}
              className="text-sm text-white/80 hover:text-white underline-offset-4 hover:underline transition"
            >
              Or skip ahead and add Party On bar service →
            </Link>
          </div>
          {/* Risk reversal — Hormozi backup guarantee */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-xs md:text-sm text-white/90">
            <svg className="w-4 h-4 text-brand-yellow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Backup-DJ guarantee:</strong> if [DJ_NAME] has an emergency, Party On&apos;s network covers your date — no scrambling.</span>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="container-custom py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { stat: '100+', label: 'Weddings booked' },
              { stat: '5.0★', label: 'Average review' },
              { stat: 'TABC', label: 'Bar licensed' },
              { stat: '$1M', label: 'Insured' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-heading text-3xl md:text-4xl tracking-[0.05em] text-brand-blue mb-1">
                  {s.stat}
                </div>
                <div className="text-sm text-gray-700 uppercase tracking-[0.08em]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAMPLE MIX / VIDEO */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue text-center mb-2">
            Hear The Set
          </p>
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 text-center mb-8 tracking-[0.05em]">
            Sample wedding mix
          </h2>
          {/* TODO(dj-assets): replace iframe src with the real sample-mix or
              wedding-reel embed (YouTube, Mixcloud, SoundCloud, etc.) */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white/70 px-6">
              <p className="font-heading text-xl mb-2">[DJ_SAMPLE_VIDEO]</p>
              <p className="text-sm">Embed placeholder — operator to replace with the DJ&apos;s sample mix.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE DJ */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative">
            {/* TODO(dj-assets): swap [DJ_PHOTO] placeholder image */}
            <Image
              src={HERO_IMAGE}
              alt="[DJ_PHOTO] — portrait"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2">
              About The DJ
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.05em]">
              [DJ_NAME]
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              [DJ_BIO] — Austin-based wedding DJ specializing in ceremony music,
              cocktail hour, and full reception sets. Known for reading the room and
              keeping the dance floor full through the last song.
            </p>
            <p className="text-base text-gray-700 leading-relaxed mb-6">
              Pairs naturally with Party On bar service: while [DJ_NAME] handles the
              soundtrack, Party On handles the drinks. One inquiry covers both.
            </p>
            <Button variant="primary" size="md" href="#inquiry">
              Check Availability
            </Button>
          </div>
        </div>
      </section>

      {/* BUNDLE: DJ + BAR */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2">
              DJ + Bar Bundle
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-[0.05em] mb-3">
              One inquiry. One weekend. Two services.
            </h2>
            <p className="text-base text-gray-700 max-w-2xl mx-auto">
              Most couples book a DJ from one company and a bar service from another, then
              spend hours coordinating timing. We solved that. Book both here in one form.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                title: 'DJ — ceremony to last dance',
                items: ['Ceremony music + processional', 'Cocktail hour set', 'Full reception with MC', 'Sound system included'],
              },
              {
                title: 'Bar — stocked + iced',
                items: ['TABC-licensed alcohol delivery', 'Ice, cups, glassware', 'Optional bartender(s)', 'Custom signature cocktails'],
              },
              {
                title: 'Coordinated weekend',
                items: ['Single inquiry covers both', 'Aligned setup + breakdown', 'One point of contact', 'No double-booking conflicts'],
              },
            ].map((card) => (
              <div key={card.title} className="card">
                <h3 className="font-heading text-lg font-bold tracking-[0.08em] text-gray-900 mb-4">
                  {card.title}
                </h3>
                <ul className="space-y-2">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bundle savings anchor + pricing teaser */}
          <div className="bg-brand-yellow/10 border-l-4 border-brand-yellow rounded-lg p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2">
                  Bundle Savings
                </p>
                <h3 className="font-heading text-2xl md:text-3xl text-gray-900 tracking-[0.05em] mb-3">
                  Save ~$200 vs. booking separately
                </h3>
                <p className="text-base text-gray-700">
                  Party On bar packages start around <strong>$400</strong> for a small wedding;
                  full bar with bartender for 100 guests runs <strong>$1,500-$2,500</strong>
                  depending on the menu. {/* TODO(dj-assets): replace [DJ_PRICING] with confirmed package starting price */}
                  DJ packages <strong>from [DJ_PRICING]</strong> — book both via the form
                  below and we waive the bar setup fee.
                </p>
              </div>
              <div className="md:text-right">
                <Button variant="cart" size="lg" href="#inquiry">
                  Get The Bundle Quote
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — placeholder until DJ supplies real ones */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2">
              Past Couples
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-[0.05em]">
              What [DJ_NAME]&apos;s couples say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TODO(dj-assets): replace [TESTIMONIAL_*] with real review copy + names from
                the DJ's Google Business Profile / The Knot / WeddingWire. Outcome-first:
                "Saved $X / had a packed dance floor / friends are still talking about it." */}
            {[
              { quote: '[TESTIMONIAL_1]', author: '[COUPLE_1]', detail: '[VENUE_1] · [MONTH_YEAR_1]' },
              { quote: '[TESTIMONIAL_2]', author: '[COUPLE_2]', detail: '[VENUE_2] · [MONTH_YEAR_2]' },
            ].map((t, idx) => (
              <div key={idx} className="card">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-base text-gray-700 italic leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="font-heading font-bold tracking-[0.05em] text-gray-900">
                  — {t.author}
                </p>
                <p className="text-sm text-gray-600">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INQUIRY FORM */}
      <section id="inquiry" className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-center mb-8">
            <p className="text-sm font-heading uppercase tracking-[0.08em] text-brand-blue mb-2">
              Check Availability
            </p>
            <h2 className="font-heading text-3xl md:text-4xl text-gray-900 tracking-[0.05em] mb-3">
              Book [DJ_NAME] for your wedding
            </h2>
            <p className="text-base text-gray-700">
              Fill out the form and we&apos;ll confirm [DJ_NAME]&apos;s availability + send a Party
              On bar quote within 24 hours.
            </p>
          </div>
          <AustinWeddingDjInquiryForm refCode={REF_CODE} />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <h2 className="font-heading text-3xl md:text-4xl text-gray-900 text-center mb-10 tracking-[0.05em]">
            FAQs
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="card">
                <summary className="cursor-pointer font-heading text-base font-bold tracking-[0.05em] text-gray-900 list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <svg className="w-5 h-5 text-brand-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-sm text-gray-700 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gray-900 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 md:px-8 text-center text-white">
          <h2 className="font-heading text-3xl md:text-4xl tracking-[0.05em] mb-4">
            Your wedding DJ + your wedding bar.
          </h2>
          <p className="text-base text-white/80 mb-8">
            One inquiry. [DJ_NAME] on the mic, Party On on the bar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="cart" size="lg" href="#inquiry">
              Inquire About [DJ_NAME]
            </Button>
            <Link
              href={`/order?ref=${REF_CODE}&p=wedding`}
              className="btn-secondary"
            >
              Order Bar Service →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
