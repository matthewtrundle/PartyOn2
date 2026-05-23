/**
 * Partner Landing Page Data
 * Contains data for dedicated partner landing pages with ordering functionality
 * To add a new partner: copy an existing entry and modify the values
 */

import type { PartnerLandingPage } from './types';

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Premier Party Cruises - Lake Travis boat party rentals
 */
export const premierPartyCruises: PartnerLandingPage = {
  slug: 'premier-party-cruises',
  name: 'Premier Party Cruises',
  tagline: 'Lake Travis Party Boat Rentals',
  description:
    "Austin's favorite party boat rentals on Lake Travis. Get free delivery to the marina, easy group ordering, and extra perks for your boat party.",
  heroVideoUrl: 'https://www.youtube.com/watch?v=4-Yx24Y6oro',
  heroVideoId: '4-Yx24Y6oro',
  heroImageUrl: '/images/partners/premierpartycruises-hero.webp',
  bulletPoints: [
    {
      text: 'Free delivery to Premier Party Cruises marina and cooler stocking',
      icon: 'delivery',
    },
    {
      text: 'Easy Group Ordering',
      icon: 'group',
    },
    {
      text: 'Plus extra perks delivered to your local spot!',
      icon: 'perks',
    },
  ],
  priceIndicator: '$',
  websiteUrl: 'https://premierpartycruises.com',
  orderTypes: [
    {
      id: 'boat',
      label: 'Start a Boat Order',
      description: 'Order drinks for your Premier Party Cruises boat party',
      icon: 'anchor',
    },
    {
      id: 'airbnb',
      label: 'Start an Airbnb Order',
      description: 'Order drinks delivered to your rental property',
      icon: 'home',
    },
  ],
  faqs: [
    {
      question: 'How does delivery work?',
      answer:
        "We deliver directly to the Premier Party Cruises marina at Lake Travis. Just place your order and we'll have your drinks ready and waiting when you arrive. We can even stock your coolers for you!",
    },
    {
      question: 'How many drinks do I need?',
      answer:
        "Use our drink calculator to estimate the perfect amount for your group. A good rule of thumb is 2-3 drinks per person per hour for a typical boat party.",
      link: {
        text: 'Use Drink Calculator',
        url: '#drink-calculator',
        external: false,
      },
    },
    {
      question: 'Still need to book a boat party?',
      answer:
        "Premier Party Cruises offers private boat rentals on Lake Travis for groups of 5-75 people. They've been Austin's favorite for 15+ years!",
      link: {
        text: "Visit Premier Party Cruises' Website",
        url: 'https://premierpartycruises.com',
        external: true,
      },
    },
    {
      question: "What's included in the service?",
      answer:
        'We provide alcohol delivery, ice, cooler stocking, and mixers. Just tell us what you need and we handle the rest so you can focus on having fun on the lake.',
    },
    {
      question: 'Can I order for a group?',
      answer:
        "Absolutely! Our group ordering feature lets everyone contribute to one order. The host creates an order, shares the link, and friends can add their drinks. When you're ready, checkout with one combined delivery.",
    },
  ],
  logoUrl: '/images/partners/premierpartycruises-logo.webp',
  serviceArea: 'Lake Travis, Austin TX',
  isActive: true,
};

/**
 * Austin Wedding DJ — partner referral landing page (WS3 of the wedding cluster build).
 *
 * Targets `wedding dj austin` (390 vol, KD 8) and `austin wedding djs` (170 vol, KD 28).
 * Partner is a friend of POD who wants more wedding bookings; he becomes an affiliate.
 *
 * Placeholders (TODO operator action):
 * - [DJ_NAME], [DJ_PHOTO], [DJ_BIO], [DJ_SAMPLE_VIDEO] live in the page + this entry.
 *   Find with: rg "\[DJ_(NAME|PHOTO|BIO|SAMPLE_VIDEO)\]" src/
 * - Affiliate referral code is `WEDDING_DJ` placeholder — replace with the real
 *   affiliate code generated from /admin/affiliates/new once the DJ is onboarded.
 */
export const austinWeddingDj: PartnerLandingPage = {
  slug: 'austin-wedding-dj',
  name: '[DJ_NAME] — Austin Wedding DJ',
  tagline: 'Austin Wedding DJ + Bar Service',
  description:
    "Austin wedding DJ paired with TABC-licensed alcohol delivery. Book [DJ_NAME] for your ceremony, cocktail hour, and reception — and let Party On stock the bar.",
  // TODO(dj-assets): replace heroVideoUrl with the DJ's sample mix / wedding reel
  heroVideoUrl: '[DJ_SAMPLE_VIDEO]',
  heroVideoId: '',
  // TODO(dj-assets): replace with a real DJ photo at /public/images/partners/austin-wedding-dj-hero.webp
  heroImageUrl: '/images/partners/austin-wedding-dj-hero.webp',
  bulletPoints: [
    { text: 'Austin wedding DJ — ceremony, cocktail hour, reception', icon: 'group' },
    { text: 'Bundle with TABC-licensed bar delivery from Party On', icon: 'delivery' },
    { text: 'One coordinated weekend — DJ + drinks + setup', icon: 'perks' },
  ],
  priceIndicator: '$$',
  websiteUrl: '',
  orderTypes: [
    {
      id: 'wedding',
      label: 'Book [DJ_NAME] + Bar Service',
      description: 'Inquire about the DJ + add Party On alcohol delivery for the reception',
      icon: 'group',
    },
  ],
  faqs: [
    {
      question: 'Who is [DJ_NAME]?',
      answer:
        '[DJ_BIO] — Austin-based wedding DJ specializing in ceremony music, cocktail hour, and full reception sets. Replace this copy when assets land.',
    },
    {
      question: 'How does the DJ + bar bundle work?',
      answer:
        "Inquire here for [DJ_NAME]'s booking, then add Party On for the bar. We coordinate timing so the bar is set up before doors open and the DJ has a smooth handoff between ceremony, cocktail hour, and reception.",
    },
    {
      question: 'What does Party On bring to the wedding?',
      answer:
        "TABC-licensed alcohol delivery, ice, cups, glassware, and optional bartender. We pair with the DJ's schedule so service starts when guests need it.",
    },
    {
      question: 'Pricing?',
      answer:
        "DJ pricing set by [DJ_NAME] directly — quote on inquiry. Party On bar packages start around $400 for a small wedding; full bar with bartender for 100 guests typically runs $1,500-$2,500 depending on the menu.",
    },
    {
      question: "What if our venue doesn't allow outside DJs or alcohol?",
      answer:
        "Most Austin venues allow both with proper licensing and insurance. We're TABC-licensed and $1M insured; [DJ_NAME] carries the standard DJ liability coverage venues require. We'll confirm with your venue when you inquire.",
    },
  ],
  // TODO(dj-assets): replace with a real DJ logo at /public/images/partners/austin-wedding-dj-logo.webp
  logoUrl: '/images/partners/austin-wedding-dj-logo.webp',
  serviceArea: 'Austin TX, Hill Country, Lake Travis',
  isActive: true,
};

/**
 * All partner landing pages
 * Add new partners to this array
 */
export const partnerLandingPages: PartnerLandingPage[] = [
  premierPartyCruises,
  austinWeddingDj,
];

/**
 * Get partner landing page by slug
 */
export function getPartnerLandingPage(
  slug: string
): PartnerLandingPage | undefined {
  return partnerLandingPages.find((p) => p.slug === slug);
}

/**
 * Get all active partner landing pages
 */
export function getActivePartnerLandingPages(): PartnerLandingPage[] {
  return partnerLandingPages.filter((p) => p.isActive);
}
