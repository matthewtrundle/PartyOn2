import type { LandingConfig } from '../types';

const PHONE_DISPLAY = '(737) 371-9700';

export const corporateConfig: LandingConfig = {
  slug: 'austin-corporate-event-delivery',
  // Title trimmed to <60 chars so it doesn't truncate in SERPs.
  metaTitle: 'Austin Corporate Event Alcohol Delivery | Party On Delivery',
  metaDescription:
    'White-glove premium spirits, wine, and bar setups for Austin corporate offsites, client dinners, and team events. TABC-licensed. $1M insured. Invoices on request. Refunds on up to 25% unopened.',
  ogImage: '/images/products/premium-spirits-boutique.webp',

  theme: {
    primary: '#C8A96A',          // champagne gold
    primaryHover: '#B59456',
    primaryText: '#0E0E10',
    navy: '#0E0E10',             // near-black charcoal
    cream: '#F4EFE6',            // warm linen
    blue: '#7A6643',             // muted bronze
  },
  eventLabel: 'AUSTIN CORPORATE EVENT ALCOHOL DELIVERY',
  audienceTitleCase: 'Corporate Event',

  heroEyebrow: 'AUSTIN CORPORATE EVENT ALCOHOL DELIVERY',
  heroHeadline: 'Premium Bar Service.',
  heroHeadlineAccent: 'Delivered To Your Boardroom.',
  heroSubhead:
    "Top-shelf spirits, sommelier-curated wines, and full bar setups for offsites, client dinners, holiday parties, and SXSW activations. Invoiced. Insured. Discreetly delivered.",
  heroBullets: [
    'Top-shelf spirits + sommelier-curated wines',
    'TABC-licensed · $1M insured · 100% refund on up to 25% unopened',
    'Invoices on request · corporate cards / ACH / wire',
    'White-glove delivery — coordinated with your venue',
  ],
  heroImage: '/images/products/premium-spirits-lifestyle.webp',
  heroImages: [
    {
      src: '/images/hero/corporate-hero-conference.webp',
      alt: 'Corporate conference reception bar stocked by Party On Delivery in Austin',
    },
    {
      src: '/images/hero/corporate-hero-gala.webp',
      alt: 'Austin corporate gala with premium wine and champagne service',
    },
    {
      src: '/images/hero/corporate-hero-tech.webp',
      alt: 'Austin tech company happy hour with craft beer and cocktails delivered',
    },
  ],
  heroTrustBadges: ['✓ TABC-licensed', '✓ $1M insured', '✓ COI available', '✓ Corporate cards / ACH / wire'],

  trustStats: [
    { stat: '500+', label: 'Austin events served' },
    { stat: '5.0★', label: 'Google rating — see reviews below' },
    { stat: '$1M', label: 'GL + liquor liability insured · COI on request' },
    { stat: '72-hr', label: 'Standard lead time — faster when needed' },
  ],

  painHeadline:
    "Event vendors shouldn't be a project of their own.",
  painBody:
    "Premium spirits, curated wines, and full bar setups — invoiced, insured, delivered on time. Your finance team approves, your event runs smooth, your name looks good.",

  packagesEyebrow: 'CURATED FOR AUSTIN OFFSITES & CORPORATE EVENTS',
  packagesHeadline: 'Curated bar service. White-glove delivery.',
  packagesBlurb:
    'Designed for offsites, client dinners, and holiday parties — three flexible tiers, all premium.',
  packages: [
    {
      name: 'Executive Reception',
      price: '$1,499',
      save: 'Per event',
      serves: 'Cocktail hour for 30–40',
      blurb: "A polished bar for client meetings, board dinners, and team events.",
      items: [
        'Casamigos Blanco + Reposado',
        'Macallan 12 Single Malt',
        'Veuve Clicquot Brut (×3)',
        'Curated red & white wine selection',
        'Premium glassware, mixers, ice',
      ],
      image: '/images/products/premium-spirits-boutique.webp',
    },
    {
      name: 'Offsite Weekend',
      price: '$3,999',
      save: 'Per weekend',
      serves: 'Full offsite for 50–75',
      blurb: 'Two-day stocked bar for executive offsites, ranches, and Lake Travis venues.',
      items: [
        'Welcome reception spirits + champagne',
        'Dinner-pairing wines (white + red)',
        'Tequila & whiskey selection',
        'Daytime hard seltzers + craft beer',
        'On-site re-stock + cooler equipment',
      ],
      image: '/images/products/premium-spirits-wall.webp',
      featured: true,
    },
    {
      name: 'Holiday Party',
      price: '$2,499',
      save: 'Custom-quoted',
      serves: 'Holiday party for 75–100',
      blurb: 'Year-end celebration with the spirits, wine, and bubbly your team will actually drink.',
      items: [
        'Full open bar (vodka/tequila/whiskey/gin)',
        'Wine selection (sparkling, white, red)',
        'Craft beer + premium hard seltzers',
        'Mixers, garnishes, glassware',
        'Branded delivery bags available',
      ],
      image: '/images/products/premium-spirits-lifestyle.webp',
    },
  ],
  customLine:
    "Larger event or recurring need? Let's set up an account — call us.",

  stepsHeadline: 'From brief to pour in three steps.',
  steps: [
    {
      n: '1',
      title: 'Tell us the plan',
      body: 'Headcount, venue, vibe, and any restrictions. We respond within 48 hours.',
      shortBody: 'Headcount + venue + vibe.',
    },
    {
      n: '2',
      title: 'Curated proposal',
      body: 'You get an itemized quote/invoice. Adjust items, approve, and your date is locked.',
      shortBody: 'Itemized quote, locked.',
    },
    {
      n: '3',
      title: 'White-glove delivery',
      body: "We arrive on time, items cold, and coordinate with your venue so the whole event runs smooth.",
      shortBody: 'On time. Cold. Coordinated.',
    },
  ],

  venuesEyebrow: 'EVERYWHERE AUSTIN COMPANIES MEET',
  venuesHeadline: 'Office. Hotel ballroom. Lake ranch. We handle it.',
  // Footprint guard: only name the confirmed delivery footprint (Austin, Cedar
  // Park, Westlake, Bee Cave, Lakeway, Lake Travis) in paid landing copy.
  venues: [
    { area: 'Downtown Office Towers', detail: 'Loading dock or front desk — we know the buildings' },
    { area: 'Hotel Conference & Ballrooms', detail: 'Driskill, Fairmont, JW Marriott — coordinated with banquet teams' },
    { area: 'Lake Travis Event Venues', detail: 'Vintage Villas, Lakeway Resort, private estates' },
    { area: 'Westlake & Lakeway Venues', detail: 'Westlake, Bee Cave, Lakeway, Cedar Park offices & estates' },
    { area: 'SXSW & Conference Activations', detail: 'Brand activations, hospitality suites, panel sponsorships' },
    { area: 'Recurring Office Stocking', detail: 'Quarterly happy hours, kitchen restocks, client gifts' },
  ],
  venuesImage: '/images/products/wine-collection-cellar.webp',

  reviewsEyebrow: '★★★★★ 5.0 ON GOOGLE',
  reviewsHeadline: 'The vendor your finance team approves of.',
  // Real Google reviews (verbatim — harvested from the Business Profile reviews
  // manager, same pool as bachelor.ts). The prior three entries were fabricated
  // personas and were removed.
  // TODO(operator): swap the two non-corporate reviews below for corporate-
  // specific GBP quotes when harvested (approve verbatim — never paraphrase a
  // real review), same flow as PR #121.
  reviews: [
    {
      quote:
        'Fast, fair and convenient. Very hard to get all 3 in any business. Will use again for our next visit to Austin!',
      author: 'Tim Nappi',
      detail: '★★★★★ via Google',
    },
    {
      quote:
        'Awesome delivery service! Drinks showed up cold and on time for stocking our rental for the weekend',
      author: 'Bayne Pettinger',
      detail: '★★★★★ via Google',
    },
    {
      quote:
        'Used for a boat day on Lake Travis and it made it SO easy! Just showed up and our cooler was stocked with ice and all of the drinks we ordered ahead of time. 10/10 would recommend',
      author: 'Rivajoy Giannitsis',
      detail: '★★★★★ via Google · Lake Travis event',
    },
  ],

  faqHeadline: 'The questions every event planner asks.',
  faqs: [
    {
      q: 'How do you handle payment and invoicing?',
      a: 'We accept corporate cards (Visa/MC/Amex), ACH, and wire. We can send a paid invoice for your records.',
    },
    {
      q: 'Can you provide a Certificate of Insurance?',
      a: "Yes — $1M general liability + liquor liability. Please note: we cannot add other venues or companies as additionally insured.",
    },
    {
      q: 'Do you set up bars or just deliver?',
      a: 'Both. Drop-off + delivery is included; on-site setup, ice management, and bartending coordination are available as add-ons.',
    },
    {
      q: 'Lead time for corporate events?',
      a: '72 hours for standard orders. For events over $5,000 or with custom requirements, plan 1–2 weeks. We move fast when needed.',
    },
    {
      q: 'How are you licensed?',
      a: 'TABC packaged-store license with $1M liquor liability and insurance. Every driver is TABC-certified. We card on delivery — required by law.',
    },
    {
      q: 'Do you accept returns?',
      a: 'Yes — 100% refund on up to 25% of your order. Drop the unopened cases back at our store and we refund up to a quarter of the total, no restocking fees. Order a little heavy so you don\'t run short; anything past that quarter is yours to keep.',
    },
  ],

  popularProducts: {
    heading: 'Crowd-pleasers for Austin corporate events',
    intro:
      'The bottles and kits Austin companies add most for receptions, offsites, and office happy hours — invoiced and delivered cold to your venue.',
    items: [
      {
        handle: 'veuve-clicquot-champagne-brut-750ml',
        name: 'Veuve Clicquot Brut • 750ml',
        blurb:
          'The toast bottle for client dinners and milestones — the label your guests recognize.',
        price: '$74.99',
      },
      {
        handle: 'la-marca-prosecco-extra-dry-750ml-6-pack',
        name: 'La Marca Prosecco • 6-Pack',
        blurb:
          'Six bottles of crowd-friendly Italian bubbly — the reception and mimosa-bar workhorse by the case.',
        price: '$99.99',
      },
      {
        handle: 'aperol-spritz-party-pitcher-kit-16-drinks',
        name: 'Aperol Spritz Kit • Serves 16',
        blurb:
          'A ready-to-pour spritz bar for 16 — a polished welcome cocktail with zero bartender required.',
        price: '$67.99',
      },
      {
        handle: 'pinthouse-electric-jellyfish-16oz-4-pack-can',
        name: 'Pinthouse Electric Jellyfish IPA',
        blurb:
          "Austin's cult hazy IPA in 16oz cans — the locally owned pick that makes an office happy hour feel like a brewery run.",
        price: '$19.99',
      },
    ],
  },

  finalCtaHeadline: 'Bring us the brief.',
  finalCtaHeadlineAccent: 'We deliver the rest.',
  finalCtaSubhead:
    "From quarterly happy hours to once-a-year client galas, we make event-day stress disappear. Get a same-day quote.",
  finalCtaImage: '/images/products/premium-spirits-wall.webp',

  phoneDisplay: PHONE_DISPLAY,
  phoneTel: 'tel:7373719700',
  primaryCtaHref: '#builder',
  ctaText: 'REQUEST A CORPORATE QUOTE →',

  planningCallUrl: 'https://123.partyondelivery.com/planning-call',
  secondaryCtaText: 'SCHEDULE A 10-MIN CALL →',

  quoteInbox: 'info@partyondelivery.com',

  modal: {
    title: 'Request Your Corporate Quote',
    ctaPrimary: 'REQUEST A CORPORATE QUOTE →',
    ctaPrimaryShort: 'REQUEST QUOTE',
    steps: [
      { key: 'basics', label: 'Event brief' },
      { key: 'beer', label: 'Beer & seltzers' },
      { key: 'liquor', label: 'Spirits & wine' },
      { key: 'mixers', label: 'Mixers & service' },
      { key: 'review', label: 'Review & submit' },
    ],
    beerStepBlurb:
      'Premium hard seltzers and craft beer for happy hours, breaks, and client receptions.',
    liquorStepBlurb:
      'Top-shelf spirits and curated wines. We can substitute brands to match your office standards.',
    mixersStepBlurb:
      'Mixers, glassware, ice, and equipment. Add bartender coordination if you need full setup.',
    basicsHeadline: 'Tell us about the event.',
    basicsBlurb:
      'A 30-second brief. Our team builds a proposal with your itemized quote within 4 business hours.',
    groupSizeLabel: 'Headcount',
    groupSizeUnit: 'attendees',
    defaultPeople: 30,
    reviewHeadline: 'Review & request quote.',
    successQuoteHeadline: 'Quote request received.',
    successCheckoutHeadline: 'Quote request received.',
    emailNotice:
      "Your information stays internal. COI available on request. TABC-licensed retailer with $1M liquor liability.",
  },
};
