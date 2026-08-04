'use client';

import React, { useEffect, useRef, useState } from 'react';
import { blankHoneypotFields } from '@/lib/forms/honeypot';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import VacationRentalLeadCapture from '@/components/partners/VacationRentalLeadCapture';
import HorizontalImageCarousel from '@/components/partners/HorizontalImageCarousel';
import PartnerDashboardMock from '@/components/partners/PartnerDashboardMock';
import { vacationRentalHeroMedia } from '@/generated/vacation-rental-hero-media';
import { getAttribution } from '@/lib/analytics/attribution';

// Auto-loaded from public/images/partners/vacation-rental-hero/ — drop or delete
// images in that folder, then `npm run hero:refresh` (build does it automatically).
const HERO_CAROUSEL_IMAGES = vacationRentalHeroMedia;

const TABC_CAROUSEL_IMAGES = [
  { src: '/images/services/boat-parties/captains-cooler.webp', alt: 'Party On Delivery cocktail kit cooler on a Premier party boat' },
  { src: '/images/services/boat-parties/luxury-yacht-deck.webp', alt: 'Luxury yacht deck bar setup' },
  { src: '/images/services/weddings/signature-cocktails-closeup.webp', alt: 'Signature cocktails close up' },
  { src: '/images/services/weddings/signature-cocktails-rings.webp', alt: 'Signature cocktail flight' },
  { src: '/images/products/branded-delivery-bag.webp', alt: 'Branded Party On Delivery bag' },
  { src: '/images/products/delivery-bag-contents.webp', alt: 'Delivery bag contents' },
  { src: '/images/experience/curated-spirits-display.webp', alt: 'Curated spirits display' },
  { src: '/images/experience/five-star-service.webp', alt: 'Five-star concierge service' },
];

const COCKTAILS = [
  { name: 'Lady Bird Margarita', sub: 'Lunazul Blanco · Fresh Victor lime', img: '/images/products/fresh-victor-cocktails/Lady Bird Margarita/Gemini_Generated_Image_95mqfa95mqfa95mq.png' },
  { name: 'Barton Springs Mojito', sub: 'Island Getaway rum · mint · citrus', img: '/images/products/fresh-victor-cocktails/Barton Springs Mojito/Gemini_Generated_Image_4u61bg4u61bg4u61.png' },
  { name: 'Lake Travis Ranch Water', sub: 'Lunazul · Topo Chico · lime', img: '/images/products/fresh-victor-cocktails/Lake Travis Ranch Water/Gemini_Generated_Image_8hxllx8hxllx8hxl.png' },
  { name: '6th Street Gold Rush', sub: 'Treaty Oak bourbon · honey · lemon', img: '/images/products/fresh-victor-cocktails/6th Street Gold Rush/Gemini_Generated_Image_1fy2mm1fy2mm1fy2.png' },
  { name: 'Keep Austin Spicy Marg', sub: 'Dulce Vida · jalapeño · agave', img: '/images/products/fresh-victor-cocktails/Keep Austin Spicy Marg/Gemini_Generated_Image_bm1s1dbm1s1dbm1s.png' },
  { name: 'SoCo Carajillo Latte', sub: 'Cold brew · Licor 43 · oat milk', img: '/images/products/fresh-victor-cocktails/SoCo Carajillo Latte/Gemini_Generated_Image_kzjusnkzjusnkzju.png' },
  { name: 'Lake Day Daiquiri', sub: 'White rum · lime · cane sugar', img: '/images/products/fresh-victor-cocktails/Lake Day Daiquiri/Gemini_Generated_Image_cpuxsrcpuxsrcpux.png' },
  { name: 'Cucumber Crush Margarita', sub: 'Tequila · cucumber · lime', img: '/images/products/fresh-victor-cocktails/Cucumber Crush Margarita/Gemini_Generated_Image_9t92hz9t92hz9t92.png' },
  { name: 'Pink Party Lemonade', sub: 'Vodka · pink lemonade · prosecco', img: '/images/products/fresh-victor-cocktails/Pink Party Lemonade/Gemini_Generated_Image_bdur4kbdur4kbdur.png' },
  { name: 'Eastside Gin and Tonic', sub: 'Dripping Springs gin · tonic · lime', img: '/images/products/fresh-victor-cocktails/Eastside Gin and Tonic/Gemini_Generated_Image_2dlh2q2dlh2q2dlh (1).png' },
  { name: 'Strawberry Sunset Mocktail', sub: 'Zero-proof · strawberry · citrus', img: '/images/products/fresh-victor-cocktails/Strawberry Sunset Mocktail/Gemini_Generated_Image_87dgn687dgn687dg (1).png' },
  { name: 'Zilker Lime Fizz Mocktail', sub: 'Zero-proof · lime · soda', img: '/images/products/fresh-victor-cocktails/Zilker Lime Fizz Mocktail/Gemini_Generated_Image_8l6t8o8l6t8o8l6t.png' },
];

const FAQS = [
  {
    q: 'How does the partnership work financially?',
    a: 'Property managers earn a revenue share on every order placed through their branded link, and it grows as order volume through your link grows. No upfront cost, no monthly minimums.',
  },
  {
    q: 'Can we white-label the experience?',
    a: 'Yes. We offer co-branded and fully white-labeled ordering pages depending on your tier and portfolio size.',
  },
  {
    q: 'Do you carry liability insurance?',
    a: 'Yes. POD carries full liquor liability insurance and our TABC license is current. We can provide a Certificate of Insurance naming your company as an additional insured if required.',
  },
  {
    q: "What's the minimum order?",
    a: 'Delivery minimums depend on zone — typically $100 in core Austin and $150 for lakes and Hill Country. Free delivery thresholds available for partner-linked orders.',
  },
  {
    q: 'How fast can you turn around an order?',
    a: 'Same-day delivery on orders placed by 4pm. Restocks within hours during peak weekend hours. Pre-scheduled welcome deliveries timed to guest check-in.',
  },
  {
    q: 'What if a guest cancels?',
    a: 'We follow a clear cancellation policy that protects both the guest and the property manager. Standard policies aligned with hospitality industry norms.',
  },
];

const SERVICES = [
  {
    title: 'TABC-licensed delivery',
    body: 'Beer, wine, spirits, mixers, ice. Direct to the property. Legally. With ID checks at handoff.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: '17 signature cocktails',
    body: 'Pre-batched, ready to pour. Built with Texas spirits and Fresh Victor mixers. Lady Bird Margarita, Barton Springs Mojito, Rainey Street Paloma, and more.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14l-2 8a5 5 0 0 1-5 4 5 5 0 0 1-5-4L5 3zM12 15v6M8 21h8" />
      </svg>
    ),
  },
  {
    title: 'Bartender coordination',
    body: 'Vetted local bartenders, scheduled and supplied. Setup, service, breakdown. You don’t lift a finger.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25c0-3.728 3.358-6.75 7.5-6.75s7.5 3.022 7.5 6.75" />
      </svg>
    ),
  },
  {
    title: 'Boat & lake delivery',
    body: 'Lake Travis, Lake Austin, Lake LBJ, Paradise Cove. Delivered to the dock, the slip, or the boat.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18s1.5-1 3-1 3 1 4.5 1 3-1 4.5-1 3 1 3 1M5 13l7-9 7 9M12 4v14" />
      </svg>
    ),
  },
  {
    title: 'Same-day restock',
    body: 'Guests ran out of tequila Saturday afternoon. We’re there before sunset. They tell their group. Their group tips your housekeeper.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001a7.5 7.5 0 0 0-12.548-3.42M3 12a9 9 0 0 1 14.85-6.4M2.985 14.652H7.98m9.5 5.748a9 9 0 0 1-14.85-6.4" />
      </svg>
    ),
  },
  {
    title: 'White-label concierge link',
    body: 'A branded ordering link in your guest welcome packet. Looks like your concierge. Powered by us.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
];

const USE_CASES = [
  {
    title: 'Bachelor weekends',
    body: 'Lake Travis boat day, downtown bar crawl, party house bar setup. We handle the whole weekend — cocktail kits delivered straight to your Premier Party Cruises boat.',
    image: '/images/services/boat-parties/captains-cooler.webp',
  },
  {
    title: 'Bachelorette weekends',
    body: 'Champagne welcomes, brunch bar, signature cocktails for the photoshoot. Insta-ready.',
    image: '/images/hero/wedding-hero-garden.webp',
  },
  {
    title: 'Wedding welcomes',
    body: 'Welcome bar at the rental, rehearsal dinner support, day-after brunch restocks.',
    image: '/images/hero/luxury-wedding-estate-1.webp',
  },
  {
    title: 'Corporate retreats',
    body: 'Executive-grade welcome bars, full-service bartending, invoiced billing for finance teams.',
    image: '/images/hero/corporate-hero-gala.webp',
  },
];

const SERVICE_AREAS = [
  'Downtown Austin',
  'Westlake / Rollingwood',
  'Lake Travis',
  'Lake Austin',
  'Lake LBJ',
  'Dripping Springs',
  'Paradise Cove Marina',
  'Hill Country',
];

export default function VacationRentalsPartnerPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    numberOfRooms: '',
    currentProvider: '',
    monthlyVolume: '',
    interests: [] as string[],
    notes: '',
    consent: false,
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
  });
  const formLoadedAt = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-verify age for B2B partner pages
  useEffect(() => {
    localStorage.setItem('age_verified', 'true');
  }, []);

  // Capture UTM params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setFormData((prev) => ({
        ...prev,
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
      }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox' && 'checked' in e.target) {
      const checkbox = e.target as HTMLInputElement;
      if (name === 'consent') {
        setFormData((prev) => ({ ...prev, consent: checkbox.checked }));
      } else if (name === 'interests') {
        const v = checkbox.value;
        setFormData((prev) => ({
          ...prev,
          interests: checkbox.checked ? [...prev.interests, v] : prev.interests.filter((i) => i !== v),
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.consent) {
      setErrorMessage('Please fill in all required fields and agree to the terms.');
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          businessName: formData.businessName || `${formData.firstName} ${formData.lastName}`,
          businessType: 'Vacation Rental',
          partnerType: 'Vacation Rental',
          contactName: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          numberOfRooms: formData.numberOfRooms,
          currentProvider: formData.currentProvider,
          monthlyVolume: formData.monthlyVolume,
          interests: formData.interests,
          message: `Properties: ${formData.numberOfRooms || 'Not specified'}
Current alcohol provider: ${formData.currentProvider || 'None / not specified'}
Monthly volume estimate: ${formData.monthlyVolume || 'Not specified'}
Interests: ${formData.interests.join(', ') || 'Not specified'}
Notes: ${formData.notes || 'None'}

UTM Source: ${formData.utm_source || 'direct'}
UTM Campaign: ${formData.utm_campaign || 'none'}`,
          utm_source: formData.utm_source,
          utm_medium: formData.utm_medium,
          utm_campaign: formData.utm_campaign,
          utm_content: formData.utm_content,
          source: 'vacation-rental-partners-page',
          submittedAt: new Date().toISOString(),
          attribution: getAttribution(),
          _formLoadedAt: formLoadedAt.current,
          // Honeypot: always-empty trap, unified non-autofill name (see @/lib/forms/honeypot).
          ...blankHoneypotFields(),
        }),
      });
      const result = await response.json();
      // Require a persisted inquiryId — a honeypot/too-fast/gibberish drop (or a
      // failed save) returns success:true without one.
      if (!response.ok || !result.success || !result.inquiryId) {
        throw new Error(result.error || 'Submission failed');
      }
      setSubmitStatus('success');
      setFormData({
        firstName: '',
        lastName: '',
        businessName: '',
        email: '',
        phone: '',
        numberOfRooms: '',
        currentProvider: '',
        monthlyVolume: '',
        interests: [],
        notes: '',
        consent: false,
        utm_source: formData.utm_source,
        utm_medium: formData.utm_medium,
        utm_campaign: formData.utm_campaign,
        utm_content: formData.utm_content,
      });
    } catch (err) {
      console.error('Form submission error:', err);
      setErrorMessage('Something went wrong. Please try again or call us at (737) 371-9700.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <Navigation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="font-manrope text-gray-900">
        {/* ============ LEAD CAPTURE STRIP ============ */}
        <section className="mt-24 bg-navy text-cream py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-8">
              <div className="eyebrow text-xs md:text-sm text-brand-yellow mb-4">
                For Austin-area luxury STR property managers
              </div>
              <h2 className="font-heading font-bold text-3xl md:text-5xl tracking-[0.04em] mb-3 text-cream">
                Want the partner one-pager?
              </h2>
              <p className="text-base md:text-lg text-cream/80 max-w-2xl mx-auto">
                Drop your details. We&apos;ll email the partner one-pager (PDF), the full cocktail menu,
                and a link to book a 15-minute walkthrough.
              </p>
            </div>
            <VacationRentalLeadCapture source="vacation-rental-onepager" />
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-cream/70">
              <span className="flex items-center gap-2"><span className="text-brand-yellow font-bold">✓</span> TABC-licensed</span>
              <span className="flex items-center gap-2"><span className="text-brand-yellow font-bold">✓</span> Fully insured</span>
              <span className="flex items-center gap-2"><span className="text-brand-yellow font-bold">✓</span> Austin-owned</span>
              <span className="flex items-center gap-2"><span className="text-brand-yellow font-bold">✓</span> Trusted by Premier Party Cruises</span>
            </div>
          </div>
        </section>

        {/* ============ HERO ============ */}
        <section className="bg-cream">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl py-20 md:py-28">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue px-4 py-2 rounded-full mb-8">
                  <span className="w-2 h-2 bg-brand-blue rounded-full inline-block" />
                  <span className="eyebrow text-xs">For Austin-area luxury STR property managers</span>
                </div>
                <h1 className="font-heading font-extrabold text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-[-0.01em] mb-8 text-gray-900">
                  The bar program<br />
                  your luxury rentals<br />
                  <span className="editorial text-brand-blue">have been missing.</span>
                </h1>
                <p className="text-lg md:text-xl mb-10 max-w-2xl text-gray-700 leading-relaxed">
                  TABC-licensed alcohol delivery, signature craft cocktails, bartender coordination, and full bar setup.
                  Built for Austin&apos;s premium short-term rentals — turnkey for your guests, hands-off for your team.
                </p>
                <div className="flex flex-wrap gap-4 mb-10">
                  <button onClick={scrollToForm} className="btn-primary">Book a 15-min intro call</button>
                  <button onClick={scrollToServices} className="bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-cream font-heading font-bold tracking-[0.08em] uppercase px-7 py-4 rounded-lg transition-colors">
                    See what we handle
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-700">
                  <span className="flex items-center gap-2"><span className="text-brand-blue font-bold">✓</span> TABC-licensed</span>
                  <span className="flex items-center gap-2"><span className="text-brand-blue font-bold">✓</span> Fully insured</span>
                  <span className="flex items-center gap-2"><span className="text-brand-blue font-bold">✓</span> Austin-owned</span>
                  <span className="flex items-center gap-2"><span className="text-brand-blue font-bold">✓</span> Trusted by Premier Party Cruises</span>
                </div>
              </div>
              <div className="lg:col-span-5">
                <HorizontalImageCarousel
                  images={HERO_CAROUSEL_IMAGES}
                  cardWidth={360}
                  aspect="4/5"
                  durationSec={45}
                  className="w-full shadow-premium rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============ TICKER ============ */}
        <div className="overflow-hidden py-6 bg-navy border-y border-white/10">
          <div className="flex gap-12 animate-scroll-left whitespace-nowrap font-heading font-bold text-2xl md:text-3xl tracking-[0.08em] text-brand-yellow">
            {Array.from({ length: 2 }).flatMap((_, batch) =>
              [
                'TABC LICENSED',
                'LAKE TRAVIS DELIVERY',
                'FULL BAR SETUP',
                '17 SIGNATURE COCKTAILS',
                'BARTENDER COORDINATION',
                'SAME-DAY RESTOCK',
              ].map((label, i) => (
                <span key={`${batch}-${i}`} className="flex items-center gap-12">
                  <span>★ {label}</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* ============ THE PROBLEM ============ */}
        <section id="problem" className="bg-cream py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mb-16">
              <div className="eyebrow text-sm text-brand-blue mb-6">The gap in your guest experience</div>
              <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] mb-6 text-gray-900">
                Your guests pay premium rates.<br />
                <span className="editorial">Then they Instacart their own booze.</span>
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                Most STR concierge stacks fall apart at the bar. Property managers either route guests to grocery delivery
                (which can&apos;t legally deliver alcohol in Texas), book a separate bartender, or leave it as a guest problem.
                The result is a hospitality gap that costs reviews.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: '01',
                  h: 'Guests expect hotel-grade welcomes.',
                  b: 'A $1,200/night house should arrive stocked. When it doesn’t, the review reflects it.',
                },
                {
                  n: '02',
                  h: "Most concierge stacks can't legally deliver alcohol.",
                  b: 'Texas requires a TABC license. Instacart, DoorDash workarounds, and "ask a friend" don’t count and put your business at risk.',
                },
                {
                  n: '03',
                  h: 'Bartender coordination is its own headache.',
                  b: "Sourcing, vetting, scheduling, supplying, and breaking down a bar shouldn’t be on your team's plate.",
                },
              ].map((card, i) => (
                <ScrollRevealCSS key={card.n} duration={800} delay={i * 100} y={30}>
                  <div className="bg-white border border-gray-200 p-8 h-full">
                    <div className="num text-6xl mb-4 text-brand-blue">{card.n}</div>
                    <h3 className="font-heading font-bold text-2xl mb-3 text-gray-900">{card.h}</h3>
                    <p className="text-gray-700 leading-relaxed">{card.b}</p>
                  </div>
                </ScrollRevealCSS>
              ))}
            </div>
          </div>
        </section>

        {/* ============ WHAT WE HANDLE ============ */}
        <section id="services" className="bg-white py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="grid lg:grid-cols-12 gap-12 mb-16">
              <div className="lg:col-span-5">
                <div className="eyebrow text-sm text-brand-blue mb-6">What POD handles</div>
                <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] text-gray-900">
                  One vendor.<br />
                  <span className="editorial">The whole bar program.</span>
                </h2>
              </div>
              <div className="lg:col-span-7 flex items-end">
                <p className="text-lg text-gray-700 leading-relaxed">
                  We replace the patchwork of grocery hacks, separate bartender bookings, and DIY stocking runs with a
                  single licensed partner. Your guests see hotel-grade service. Your team stays hands-off.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
              {SERVICES.map((s, i) => (
                <ScrollRevealCSS key={s.title} duration={800} delay={(i % 3) * 100} y={30}>
                  <div className="bg-white p-10 h-full">
                    <div className="text-brand-yellow mb-6">{s.icon}</div>
                    <h3 className="font-heading font-bold text-2xl md:text-3xl mb-3 text-gray-900">{s.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{s.body}</p>
                  </div>
                </ScrollRevealCSS>
              ))}
            </div>
          </div>
        </section>

        {/* ============ TABC DIFFERENTIATOR ============ */}
        <section className="bg-navy text-cream py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 bg-brand-yellow text-navy px-4 py-2 rounded-full mb-8">
                  <span className="w-2 h-2 bg-navy rounded-full inline-block" />
                  <span className="eyebrow text-xs">The legal differentiator</span>
                </div>
                <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] mb-8 text-cream">
                  We hold the<br />
                  <span className="text-brand-yellow">TABC license.</span><br />
                  <span className="editorial text-cream/85">You hold zero liability.</span>
                </h2>
                <p className="text-lg mb-6 text-cream/75 leading-relaxed">
                  In Texas, alcohol delivery requires a TABC license, ID verification, and proper insurance.
                  Most concierge providers and grocery services don&apos;t have one — which means routing your guests
                  to them puts you, the property, and the homeowner at risk.
                </p>
                <p className="text-lg text-cream/75 leading-relaxed">
                  POD carries the license, the insurance, and the liability. You get to offer concierge alcohol service
                  to your guests with no exposure.
                </p>
              </div>
              <div className="lg:col-span-5">
                <HorizontalImageCarousel
                  images={TABC_CAROUSEL_IMAGES}
                  cardWidth={300}
                  aspect="1/1"
                  durationSec={50}
                  className="w-full rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============ COCKTAIL MENU ============ */}
        <section className="bg-cream py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <div className="eyebrow text-sm text-brand-blue mb-6">The signature menu</div>
              <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] mb-6 text-gray-900">
                Austin in a bottle.<br />
                <span className="editorial">Pre-batched. Pour and go.</span>
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                17 signature pre-batched cocktails and mocktails, each named for the city. Built with local Texas spirits —
                Lunazul, Treaty Oak, Dripping Springs Gin, Deep Eddy — and Fresh Victor premium mixers.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {COCKTAILS.map((c) => (
                <div key={c.name}>
                  <div className="relative aspect-square mb-3 bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <Image
                      src={c.img}
                      alt={c.name}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <h4 className="font-heading font-bold text-lg md:text-xl text-gray-900">{c.name}</h4>
                  <p className="text-sm text-gray-600">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <p className="text-base text-gray-700">
                Plus 5 more signature cocktails &amp; mocktails on the full menu — sent with your partner deck.
              </p>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section id="how" className="bg-white py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mb-16">
              <div className="eyebrow text-sm text-brand-blue mb-6">How partnership works</div>
              <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] mb-6 text-gray-900">
                Three steps.<br />
                <span className="editorial">Then we disappear into the background.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {[
                {
                  n: '01',
                  h: 'We give you a branded link.',
                  b: 'A custom-tracked ordering URL or QR code that goes in your guest welcome packet, digital property guide, or check-in email. Optional white-label.',
                },
                {
                  n: '02',
                  h: 'Guests order direct.',
                  b: 'They choose from our menu or one of our pre-built party packages. No back-and-forth with your team. We handle ID verification at delivery.',
                },
                {
                  n: '03',
                  h: 'We handle everything.',
                  b: 'Delivery, setup, optional bartender, restock requests, breakdown. You earn revenue share on every order from your properties.',
                },
              ].map((step, i) => (
                <ScrollRevealCSS key={step.n} duration={800} delay={i * 100} y={30}>
                  <div>
                    <div className="num text-7xl md:text-8xl mb-6 text-brand-blue leading-none">{step.n}</div>
                    <h3 className="font-heading font-bold text-2xl md:text-3xl mb-4 text-gray-900">{step.h}</h3>
                    <p className="text-gray-700 leading-relaxed">{step.b}</p>
                  </div>
                </ScrollRevealCSS>
              ))}
            </div>

            <div className="bg-cream border border-gray-200 p-8 md:p-10 grid lg:grid-cols-12 gap-10 items-center rounded-xl">
              <div className="lg:col-span-4">
                <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full mb-4">
                  <span className="eyebrow text-xs">For your team</span>
                </div>
                <h3 className="font-heading font-bold text-3xl md:text-4xl mb-4 text-gray-900">
                  A property-manager dashboard, not just a phone number.
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  See orders by property, restock requests in real time, guest preferences, and revenue earned across your
                  portfolio. Built for managers who run 10 to 100+ properties.
                </p>
              </div>
              <div className="lg:col-span-8">
                <PartnerDashboardMock />
              </div>
            </div>
          </div>
        </section>

        {/* ============ USE CASES ============ */}
        <section className="bg-cream py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="grid lg:grid-cols-12 gap-12 mb-16">
              <div className="lg:col-span-6">
                <div className="eyebrow text-sm text-brand-blue mb-6">Built for the bookings that matter</div>
                <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] text-gray-900">
                  The guests who book your <span className="bg-brand-yellow px-2">premium properties</span> are our entire business.
                </h2>
              </div>
              <div className="lg:col-span-6 flex items-end">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Bachelor and bachelorette weekends. Weddings. Lake parties. Corporate retreats. The high-margin,
                  group-driven bookings your portfolio depends on are exactly the trips POD was built for.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {USE_CASES.map((u, i) => (
                <ScrollRevealCSS key={u.title} duration={800} delay={(i % 4) * 100} y={30}>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full">
                    <div className="relative aspect-[4/3]">
                      <Image src={u.image} alt={u.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-heading font-bold text-xl md:text-2xl mb-2 text-gray-900">{u.title}</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{u.body}</p>
                    </div>
                  </div>
                </ScrollRevealCSS>
              ))}
            </div>
          </div>
        </section>

        {/* ============ SERVICE AREA ============ */}
        <section className="bg-white py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5">
                <div className="eyebrow text-sm text-brand-blue mb-6">Where we deliver</div>
                <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] mb-6 text-gray-900">
                  Austin, Hill Country,<br />
                  <span className="editorial">and every lake in between.</span>
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  We deliver to private residences, vacation rentals, marinas, and boat slips across Central Texas.
                </p>
                <ul className="mt-8 grid grid-cols-2 gap-3 text-gray-900 font-medium">
                  {SERVICE_AREAS.map((area) => (
                    <li key={area} className="flex items-center gap-2">
                      <span className="text-brand-blue">●</span> {area}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-7">
                {/* TODO: swap for stylized Central Texas service-area map */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image
                    src="/images/hero/lake-travis-yacht-sunset.webp"
                    alt="Central Texas service area — Austin, Lake Travis, Hill Country"
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ TRUSTED BY ============ */}
        <section className="bg-cream py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <div className="eyebrow text-sm text-brand-blue">Trusted by Austin&apos;s hospitality leaders</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center mb-20 opacity-70">
              {/* TODO: swap for actual partner logos */}
              {['Premier Party Cruises', 'Paradise Cove', 'Anderson Mill Marina', 'Cocktail Cowboys', 'Lynn’s Lodging'].map((logo) => (
                <div key={logo} className="font-heading font-bold tracking-wider text-center text-sm text-gray-600 border border-gray-300 rounded-lg py-6 px-4">
                  {logo}
                </div>
              ))}
            </div>
            {/* Value cards — swap in real partner testimonials once we have signed quotes. */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 p-10 rounded-xl">
                <div className="editorial text-xl md:text-2xl mb-6 text-gray-900 leading-relaxed">
                  Stocked at check-in, restocked same-day on request. Your guests get hotel-grade
                  bar service &mdash; and you never touch a bottle.
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-brand-blue tracking-[0.08em] uppercase">
                  <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Effortless guest experience
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-10 rounded-xl">
                <div className="editorial text-xl md:text-2xl mb-6 text-gray-900 leading-relaxed">
                  Fully TABC-licensed and insured. Stop routing guests to grocery delivery &mdash; and earn a
                  revenue share on every order they place.
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-brand-blue tracking-[0.08em] uppercase">
                  <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Licensed, insured, profitable
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" className="bg-white py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
            <div className="mb-16">
              <div className="eyebrow text-sm text-brand-blue mb-6">FAQ</div>
              <h2 className="font-heading font-extrabold text-4xl md:text-6xl leading-[0.95] text-gray-900">
                Common partner questions.
              </h2>
            </div>
            <div className="space-y-8">
              {FAQS.map((f, i) => (
                <React.Fragment key={f.q}>
                  <div>
                    <h3 className="font-heading font-bold text-xl md:text-2xl mb-3 text-gray-900">{f.q}</h3>
                    <p className="text-gray-700 leading-relaxed">{f.a}</p>
                  </div>
                  {i < FAQS.length - 1 && <div className="h-px bg-gray-200" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA + FORM ============ */}
        <section id="cta" className="bg-navy text-cream py-24 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-5xl">
            <div className="text-center mb-12">
              <div className="eyebrow text-sm text-brand-yellow mb-6">Let&apos;s talk</div>
              <h2 className="font-heading font-extrabold text-4xl md:text-7xl leading-[0.95] mb-6 text-cream">
                Add POD to your <span className="text-brand-yellow">portfolio.</span>
              </h2>
              <p className="text-lg md:text-xl max-w-2xl mx-auto text-cream/75 leading-relaxed">
                15 minutes. We&apos;ll walk through your portfolio, show you the partner dashboard, and outline what a
                partnership looks like.
              </p>
            </div>

            <div id="partner-form" className="bg-white text-gray-900 rounded-xl p-8 md:p-10 max-w-3xl mx-auto">
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-base">
                  Thanks — our partnership team will be in touch within 24 hours.
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-base">
                  {errorMessage}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium mb-1">First name <span className="text-red-600">*</span></label>
                    <input name="firstName" value={formData.firstName} onChange={handleChange} required className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-base font-medium mb-1">Last name <span className="text-red-600">*</span></label>
                    <input name="lastName" value={formData.lastName} onChange={handleChange} required className="input-premium w-full" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium mb-1">Email <span className="text-red-600">*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-premium w-full" />
                  </div>
                  <div>
                    <label className="block text-base font-medium mb-1">Phone <span className="text-red-600">*</span></label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="input-premium w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-base font-medium mb-1">Property management company</label>
                  <input name="businessName" value={formData.businessName} onChange={handleChange} className="input-premium w-full" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium mb-1"># of properties in portfolio</label>
                    <select name="numberOfRooms" value={formData.numberOfRooms} onChange={handleChange} className="input-premium w-full">
                      <option value="">Select range</option>
                      <option>1–5</option>
                      <option>6–20</option>
                      <option>21–50</option>
                      <option>51–100</option>
                      <option>100+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium mb-1">Current alcohol provider</label>
                    <input name="currentProvider" value={formData.currentProvider} onChange={handleChange} placeholder="e.g. Instacart, none, ad-hoc" className="input-premium w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-base font-medium mb-2">What are you most interested in?</label>
                  <div className="grid md:grid-cols-2 gap-2">
                    {['Welcome stocking', 'Bartender service', 'Boat / lake delivery', 'Restock concierge link', 'White-label experience', 'Group bookings (weddings, bach)'].map((item) => (
                      <label key={item} className="flex items-center gap-2 text-base">
                        <input
                          type="checkbox"
                          name="interests"
                          value={item}
                          checked={formData.interests.includes(item)}
                          onChange={handleChange}
                          className="w-4 h-4 accent-brand-blue"
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-base font-medium mb-1">Anything else we should know?</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="input-premium w-full" />
                </div>
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} required className="mt-1 w-4 h-4 accent-brand-blue" />
                  <span>I agree to be contacted by Party On Delivery about partnership opportunities. <span className="text-red-600">*</span></span>
                </label>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Sending…' : 'Submit partner inquiry'}
                </button>
              </form>
            </div>

            <p className="text-sm text-cream/55 text-center mt-8">
              Or email Allan directly: <a href="mailto:allan@partyondelivery.com" className="underline hover:text-brand-yellow">allan@partyondelivery.com</a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
