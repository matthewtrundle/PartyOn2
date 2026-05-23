import type { LandingConfig } from '../types';

const PHONE_DISPLAY = '(737) 371-9700';

export const weddingConfig: LandingConfig = {
  slug: 'austin-wedding-weekend-delivery',
  // Title trimmed to <60 chars so it doesn't truncate in SERPs.
  metaTitle: 'Austin Wedding Alcohol Delivery | Party On Delivery',
  metaDescription:
    'Stock the welcome reception, rehearsal dinner, ceremony, and after-party — coordinated across the whole wedding weekend. TABC-licensed, planner-friendly, sommelier-curated.',
  ogImage: '/images/services/bach-parties/bachelorette-champagne-tower.webp',

  theme: {
    primary: '#C8A96A',          // champagne gold
    primaryHover: '#B59456',
    primaryText: '#2A2218',      // deep espresso
    navy: '#2A2218',             // espresso brown for sophistication
    cream: '#FBF6EC',            // warm ivory
    blue: '#7E5A40',             // mocha for accents
  },
  eventLabel: 'AUSTIN WEDDING WEEKEND ALCOHOL DELIVERY',
  audienceTitleCase: 'Wedding Weekend',

  heroEyebrow: 'AUSTIN WEDDING WEEKEND ALCOHOL DELIVERY',
  heroHeadline: 'Every Toast Of The Weekend.',
  heroHeadlineAccent: 'Coordinated. Delivered. Done.',
  heroSubhead:
    "Welcome reception. Rehearsal dinner. Ceremony toasts. Reception bar. After-party. We coordinate every event of your wedding weekend, then deliver each one cold and on time.",
  heroBullets: [
    'Welcome reception → ceremony → reception → after-party',
    'Premium champagne, curated wines, full bar setups',
    'One coordinator handles every event of the weekend',
    'TABC-licensed · $1M insured · trusted by Austin planners',
  ],
  heroImage: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
  heroTrustBadges: ['✓ TABC-licensed', '✓ Wedding planners trust us', '★ 5.0 on Google'],

  trustStats: [
    { stat: '300+', label: 'Austin weddings' },
    { stat: '5.0★', label: 'Google rating' },
    { stat: '5+', label: 'Events per weekend' },
    { stat: 'TABC', label: 'Licensed & insured' },
  ],

  painHeadline: "The bar shouldn't be the thing that goes wrong on your wedding day.",
  painBody:
    "Mismatched timing across five events. Caterers up-charging for corkage. Welcome bags that nobody assembles. We sync with your planner, coordinator, and venue — then deliver every event on time, with a single point of contact for the whole weekend.",

  packagesEyebrow: 'CURATED FOR AUSTIN WEDDING WEEKENDS',
  packagesHeadline: 'One coordinator. Every event. Done right.',
  packagesBlurb:
    'Most weddings have 4–6 alcohol moments. We sequence and stock each one — sommelier-curated, planner-friendly, on time.',
  packages: [
    {
      name: 'Welcome Reception',
      price: '$899',
      save: 'Per event',
      serves: 'Welcome event for 40–60',
      blurb: 'Set the tone the night guests arrive — bubbly, signature cocktails, light bites pairings.',
      items: [
        'Veuve Clicquot Brut (×4)',
        'Whispering Angel Rosé (×4)',
        'Curated white & red wine selection',
        'Espresso Martini Cocktail Kit',
        'Glassware & ice service',
      ],
      image: '/images/services/bach-parties/brunch-mimosa-bar.webp',
    },
    {
      name: 'Full Wedding Weekend',
      price: '$5,499+',
      save: 'Custom-quoted',
      serves: 'Complete weekend for 80–150',
      blurb: 'Welcome reception, rehearsal dinner, ceremony, reception, after-party — coordinated end to end.',
      items: [
        'All-event sommelier-curated wine pairing',
        'Full open-bar spirits selection',
        'Champagne for ceremony toast',
        'Late-night signature cocktails',
        'Single coordinator across entire weekend',
      ],
      image: '/images/gallery/sunset-champagne-pontoon.webp',
      featured: true,
    },
    {
      name: 'Reception Bar',
      price: '$1,999+',
      save: 'Custom-quoted',
      serves: 'Reception for 100–150',
      blurb: 'A polished open bar for the main event — wine, beer, signature cocktails, and bubbly for toasts.',
      items: [
        'Premium open bar (4 spirits)',
        'Curated red, white & sparkling wines',
        'Craft beer + premium hard seltzers',
        'Signature cocktail pairing',
        'Toast champagne (Veuve or upgrade)',
      ],
      image: '/images/products/wine-collection-cellar.webp',
    },
  ],
  customLine:
    "Building a custom multi-event package? Call us — we love planners.",

  stepsHeadline: 'From planning meeting to final toast.',
  steps: [
    {
      n: '1',
      title: 'Tell us the weekend',
      body: 'Which events need stocking? Welcome, rehearsal, ceremony, reception, after-party, brunch — give us the timeline and we sequence the rest.',
      shortBody: 'Share your timeline.',
    },
    {
      n: '2',
      title: 'Sommelier-curated proposal',
      body: 'Itemized quote with wine pairings, signature cocktails, and event-by-event delivery times. Approve and lock the date.',
      shortBody: 'Curated quote, locked.',
    },
    {
      n: '3',
      title: 'Coordinated delivery',
      body: "Single point of contact for the whole weekend. We sync with your planner, coordinator, and venue. Cold and on time, every event.",
      shortBody: 'On time, every event.',
    },
  ],

  venuesEyebrow: 'EVERY AUSTIN WEDDING VENUE',
  venuesHeadline: 'Hill Country ranch. Downtown ballroom. Lakefront estate.',
  venues: [
    { area: 'Hill Country Ranches', detail: 'Wimberley, Dripping Springs, Driftwood, Spicewood' },
    { area: 'Downtown Hotel Ballrooms', detail: 'Driskill, Fairmont, JW Marriott, Line' },
    { area: 'Lakefront Estates', detail: 'Lake Travis, Lake Austin, private peninsulas' },
    { area: 'Vineyard & Winery Venues', detail: 'Driftwood Estate, Duchman Family, William Chris' },
    { area: 'Garden & Outdoor Venues', detail: 'Mercury Hall, Vista West Ranch, Barr Mansion' },
    { area: 'Welcome Houses & Airbnbs', detail: 'Stocked separately for guests on arrival' },
  ],
  venuesImage: '/images/products/wine-collection-cellar.webp',

  reviewsEyebrow: '★★★★★ 5.0 ON GOOGLE',
  reviewsHeadline: 'The vendor every Austin wedding planner books first.',
  reviews: [
    {
      quote:
        "We coordinate the whole weekend with one person. Welcome reception, rehearsal, ceremony toast, reception, after-party — every event arrives perfectly. Our preferred vendor for every wedding now.",
      author: 'Caroline H.',
      detail: 'Wedding Planner, Austin',
    },
    {
      quote:
        'They built our wine pairing for the rehearsal dinner and the reception, sourced everything within budget, and delivered it on a tight timeline. Stress-free.',
      author: 'Megan & Tom S.',
      detail: 'Hill Country wedding, October 2025',
    },
    {
      quote:
        "Stocked the welcome bags AND the after-party in two separate locations 20 minutes apart. Both arrived exactly when we needed them. Whole weekend went off without a hitch.",
      author: 'Jules R.',
      detail: 'Maid of Honor + planner liaison',
    },
  ],

  faqHeadline: 'The questions every couple and planner asks.',
  faqs: [
    {
      q: 'How far in advance should we book?',
      a: 'Most weddings book 6–12 weeks out. Peak Austin wedding weekends (Sept–Nov, Mar–May) fill 4–6 months ahead. The earlier you reach out, the more room we have to source rare bottles.',
    },
    {
      q: 'Can you coordinate multiple events across the weekend?',
      a: "Yes — that's what we do best. One coordinator manages the welcome reception, rehearsal dinner, ceremony, reception, and after-party. Single invoice, sequenced delivery times, synced with your planner.",
    },
    {
      q: 'Do you work with our wedding planner?',
      a: "We work directly with planners every weekend. Send us their contact and we coordinate everything through them. We're a preferred vendor for many Austin planners.",
    },
    {
      q: 'Can you handle wine pairings and signature cocktails?',
      a: "Yes — we have sommelier-curated wine pairings and we'll build signature cocktails to match your menu, color palette, or wedding theme.",
    },
    {
      q: 'Do you stock welcome bags?',
      a: "Yes — mini-bottles, hangover kits, local Austin pours, custom labeling. Drop-off direct to the welcome venue or assembled with your stationer's bags.",
    },
    {
      q: 'What about leftovers?',
      a: "We can either take back unopened cases for partial refund (depending on volume) or leave everything. Your call.",
    },
  ],

  finalCtaHeadline: 'Your wedding weekend has enough moving parts.',
  finalCtaHeadlineAccent: "Let us own the bar.",
  finalCtaSubhead:
    "From welcome reception to brunch the morning after — one coordinator, one invoice, every event handled.",
  finalCtaImage: '/images/services/bach-parties/bachelorette-champagne-tower.webp',

  phoneDisplay: PHONE_DISPLAY,
  phoneTel: 'tel:7373719700',
  primaryCtaHref: '#builder',
  ctaText: 'BUILD MY WEDDING WEEKEND →',

  planningCallUrl: 'https://123.partyondelivery.com/planning-call',
  secondaryCtaText: 'SCHEDULE A 10-MIN CALL →',

  quoteInbox: 'brian@premierpartycruises.com',

  modal: {
    title: 'Build Your Wedding Weekend',
    ctaPrimary: 'BUILD MY WEDDING WEEKEND →',
    ctaPrimaryShort: 'BUILD MY WEEKEND',
    steps: [
      { key: 'basics', label: 'Weekend basics' },
      { key: 'beer', label: 'Beer & seltzers' },
      { key: 'liquor', label: 'Spirits, wine & cocktails' },
      { key: 'mixers', label: 'Mixers & service' },
      { key: 'review', label: 'Review & submit' },
    ],
    beerStepBlurb:
      'For welcome receptions, the rehearsal patio hour, and the late-night cooler.',
    liquorStepBlurb:
      'Sommelier-curated wines, premium spirits, signature cocktail kits. We can match your menu or color palette.',
    mixersStepBlurb:
      'Mixers, garnishes, glassware, ice. Add a bartender coordinator if your venue requires one.',
    basicsHeadline: "Let's plan the whole weekend.",
    basicsBlurb:
      'Tell us which events need stocking. We sequence delivery times to match your planner.',
    groupSizeLabel: 'Guest count',
    groupSizeUnit: 'guests',
    defaultPeople: 100,
    reviewHeadline: 'Review & lock it in.',
    successQuoteHeadline: 'Wedding quote received. 🥂',
    successCheckoutHeadline: 'Wedding quote received.',
    emailNotice:
      "Wedding planners welcome — cc your planner. TABC-licensed retailer. Must be 21+ at delivery.",
    extraQuestion: {
      id: 'events',
      label: 'Which events need stocking?',
      type: 'multi-checkbox',
      options: [
        { value: 'welcome', label: 'Welcome reception' },
        { value: 'rehearsal', label: 'Rehearsal dinner' },
        { value: 'ceremony', label: 'Ceremony toast' },
        { value: 'reception', label: 'Reception bar' },
        { value: 'afterparty', label: 'After-party' },
        { value: 'brunch', label: 'Sunday brunch' },
        { value: 'welcomebags', label: 'Welcome bags / Airbnb stock' },
      ],
    },
  },
};
