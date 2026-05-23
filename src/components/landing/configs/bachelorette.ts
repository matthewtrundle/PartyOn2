import type { LandingConfig } from '../types';

const PHONE_DISPLAY = '(737) 371-9700';

export const bacheloretteConfig: LandingConfig = {
  slug: 'austin-bachelorette-party-delivery',
  // Title trimmed to <60 chars so it doesn't truncate in SERPs.
  metaTitle: 'Austin Bachelorette Alcohol Delivery | Party On Delivery',
  metaDescription:
    "Champagne, rosé, cocktail kits and brunch mimosa bars delivered to your Austin Airbnb, hotel suite, or boat. Group ordering, split pay, locally owned. 500+ groups served.",
  ogImage: '/images/services/bach-parties/bachelorette-champagne-tower.webp',

  theme: {
    primary: '#F5B0C5',          // soft rose
    primaryHover: '#F19BB7',
    primaryText: '#3F1A2C',      // deep wine
    navy: '#3F1A2C',             // deep wine instead of navy
    cream: '#FFF8F4',            // ivory cream
    blue: '#9C5A87',             // muted plum for accents
  },
  eventLabel: 'AUSTIN BACHELORETTE PARTY ALCOHOL DELIVERY',
  audienceTitleCase: 'Bachelorette Weekend',

  heroEyebrow: 'AUSTIN BACHELORETTE PARTY ALCOHOL DELIVERY',
  heroHeadline: 'Champagne Popped',
  heroHeadlineAccent: 'Before The Bride Lands.',
  heroSubhead:
    "Bubbly, rosé, cocktail pitcher kits, and brunch mimosa bars — delivered to your Airbnb, hotel suite, or Lake Travis pontoon. You handle the sashes. We handle the rest.",
  heroBullets: [
    'Champagne, rosé, seltzers & ready-to-pour pitcher kits',
    'Group ordering & split pay — every girl picks her own',
    'Airbnb, hotel suite, brunch venue, pontoon — wherever',
    'Locally owned. 500+ Austin groups served. 5.0★ on Google.',
  ],
  heroImage: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
  heroTrustBadges: [],

  trustStats: [
    { stat: 'Group ordering', label: 'Girls add to one shared cart' },
    { stat: 'Split pay', label: 'Each pays her share' },
    { stat: 'Cocktail kits', label: 'Mimosa bars, espresso martinis, ready to pour' },
    { stat: '500+', label: 'Groups served' },
  ],

  painHeadline: "You're the maid of honor — not the liquor runner.",
  painBody:
    'Drop the link in the group chat. Everyone picks what they want, splits the tab, and we deliver the champagne, rosé, and cocktail kits cold. No four-flight hauls, no Costco run, no "who owes what" texts.',

  packagesEyebrow: 'CURATED FOR AUSTIN BACHELORETTE WEEKENDS',
  packagesHeadline: 'Pick a package. Pop the bottles.',
  packagesBlurb:
    'Built around the weekends groups actually plan in Austin — Rainey Street, Lake Travis, brunch on South Congress.',
  packages: [
    {
      name: 'Welcome Cocktail Kit',
      price: '$249',
      save: 'Save $40',
      serves: 'Welcome night for 6–8',
      blurb: 'The girls land, the rosé pops, the weekend begins.',
      items: [
        'Whispering Angel Rosé (750ml)',
        'Veuve Clicquot Brut (750ml)',
        'Espresso Martini Cocktail Kit',
        'Strawberries, citrus, ice',
        'Champagne flutes + napkins',
      ],
      image: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
    },
    {
      name: 'Lake Day & Night',
      price: '$549',
      save: 'Save $90',
      serves: 'Boat day + Rainey night for 10–12',
      blurb: 'A full day on the water plus a downtown night out — stocked end to end.',
      items: [
        'Veuve Clicquot Brut (750ml)',
        '2× Whispering Angel Rosé (750ml)',
        '12× High Noon Variety',
        'Hugo Spritz Pitcher Kit',
        'Floppy hats, koozies, cooler',
      ],
      image: '/images/gallery/sunset-champagne-pontoon.webp',
      featured: true,
    },
    {
      name: 'Brunch Mimosa Bar',
      price: '$199',
      save: 'Save $35',
      serves: 'Sunday brunch for 8–10',
      blurb: 'The hangover cure that doubles as the prettiest setup of the weekend.',
      items: [
        '2× Chandon Brut',
        '2× Chandon Brut Rosé',
        'Fresh OJ + grapefruit + cranberry',
        'Strawberries, raspberries, mint',
        'Glass dispenser + flutes',
      ],
      image: '/images/services/bach-parties/brunch-mimosa-bar.webp',
    },
  ],
  customLine: "Want to customize? Call us — we'll build your perfect weekend.",

  stepsHeadline: 'One link. Everyone orders. We deliver it all together.',
  steps: [
    {
      n: '1',
      title: "Open your group's shared dashboard",
      teaser: 'One link, the whole bach party inside.',
      body:
        'The maid of honor gets one shared link. Drop it in the bach chat — no apps, no logins, no group Venmo, no spreadsheets. Everyone who opens it sees the same dashboard and the same delivery plan, updated live as people add.',
      shortBody: 'Everyone picks her drinks.',
    },
    {
      n: '2',
      title: 'Everyone picks what she loves',
      teaser: 'No one gets stuck with the wrong wine.',
      body:
        'She wants the rosé. You want the espresso martini kit. The bride wants her tequila. Add pre-batched cocktail kits to keep the suite ready for every photo, and mocktail kits for the morning-after crew. Everyone sees who added what — no duplicates, no forgotten favorites.',
      shortBody: 'Rosé, kits, mocktails — all in one list.',
    },
    {
      n: '3',
      title: 'Send to every stop on the itinerary',
      teaser: 'Pontoon, suite, brunch — one dashboard.',
      body:
        'Pontoon Saturday, hotel suite Friday, brunch Sunday? Build a separate order for each spot, each with its own address, time, and deadline. Same group, same dashboard, three perfectly timed drop-offs.',
      shortBody: 'Multiple stops, one order.',
    },
    {
      n: '4',
      title: 'Each girl pays her own way — we deliver it together',
      teaser: 'Split the bill, not the weekend.',
      body:
        "When everyone's done adding, each person checks out for just what she added — separate cards, separate receipts, no awkward Venmo requests. We bundle the whole group's order behind the scenes and bring it cold to every stop, right on time.",
      shortBody: 'Each girl pays her share.',
    },
  ],

  venuesEyebrow: 'EVERYWHERE THE GIRLS GO',
  venuesHeadline: 'Hotel suite. Lake pontoon. Brunch table. We deliver.',
  venues: [
    { area: 'Downtown Hotel Suites', detail: 'Fairmont, JW Marriott, Line — discreet to your room' },
    { area: 'Rainey & East Austin Airbnbs', detail: 'Front door, kitchen-counter setup' },
    { area: 'Lake Travis Pontoons & Yachts', detail: 'Dockside loading, ice & coolers included' },
    { area: 'Brunch Spots', detail: 'Bring-your-own-bubbly venues — we time it to brunch' },
    { area: 'Spa & Pool Days', detail: 'Cabana drop-off at hotels with poolside service' },
    { area: 'Wedding-Adjacent Houses', detail: 'Wimberley, Dripping Springs, Spicewood' },
  ],
  venuesImage: '/images/hero/bach-hero-rainey.webp',

  reviewsEyebrow: '★★★★★ 5.0 ON GOOGLE',
  reviewsHeadline: 'The bride remembers everything. We make sure it sparkles.',
  reviews: [
    {
      quote:
        "Party On Delivery was amazing! Took one big part off of my plate for my sister's bachelorette weekend. I didn't have to worry about drinks at all. Highly recommend them for all needs. Ordering online in advance and having what we needed waiting for us was perfect! 10/10",
      author: 'Qiana Valentine',
      detail: '★★★★★ via Google',
    },
    {
      quote:
        "Party On Delivery made our weekend absolutely effortless and so much fun! They brought all our alcohol right to our Airbnb! We added the Skinnyrita drink package and it even came with a dispenser so our group could keep the drinks flowing. If you want that luxury, full-service party vibe brought to you anywhere — this is the team to call!",
      author: 'Austin Bach Babes',
      detail: '★★★★★ via Google',
    },
    {
      quote:
        "I would recommend this service to anyone who is going on a boat cruise! It was so nice to just show up to the boat and have all our cocktail ingredients and seltzers there. The recipes are on the pitcher and are easy for anyone to make! Prices are very reasonable, and anything you have left over you can take home!",
      author: 'Perla Albiter',
      detail: '★★★★★ via Google',
    },
  ],

  faqHeadline: 'The questions every MOH asks.',
  faqs: [
    {
      q: 'How fast can you deliver in Austin?',
      a:
        '48-hour notice is our standard window for guaranteed pricing and cold delivery. Same-day is often possible — call us at ' +
        PHONE_DISPLAY +
        ' to check.',
    },
    {
      q: 'Can you deliver to a hotel suite?',
      a: "Yes — we coordinate with the front desk or text the room directly. Discreet, no fuss.",
    },
    {
      q: 'What is the order minimum?',
      a: 'Most areas are $100–$150 minimum. Lake Travis and far-out venues start at $250 to cover the drive.',
    },
    {
      q: 'Do you set up mimosa bars?',
      a: "We deliver everything pre-stocked, chilled, and ready to pour. Glassware and dispensers included if you order them.",
    },
    {
      q: 'Are you actually licensed?',
      a: "Yes. We're TABC-licensed, fully insured, and every driver is certified. We card on delivery — required by law.",
    },
    {
      q: 'What if plans change?',
      a: 'Bach weekends shift. Reschedule free up to 6 hours before delivery. After that, we work with you.',
    },
  ],

  finalCtaHeadline: 'Lock it in.',
  finalCtaHeadlineAccent: 'Then enjoy the weekend you actually planned.',
  finalCtaSubhead:
    "Most groups book 1–3 weeks out. Lake Travis weekends and Saturday brunches fill up fast.",
  finalCtaImage: '/images/services/bach-parties/brunch-mimosa-bar.webp',

  planningCallUrl: 'https://123.partyondelivery.com/planning-call',
  secondaryCtaText: 'SCHEDULE A 10-MIN CALL →',

  phoneDisplay: PHONE_DISPLAY,
  phoneTel: 'tel:7373719700',
  primaryCtaHref: '#builder',
  ctaText: 'BUILD MY BACHELORETTE PACKAGE →',

  quoteInbox: 'brian@premierpartycruises.com',

  modal: {
    title: 'Build Your Bachelorette Package',
    ctaPrimary: 'BUILD MY BACHELORETTE PACKAGE →',
    ctaPrimaryShort: 'BUILD MY PACKAGE',
    steps: [
      { key: 'basics', label: 'Weekend basics' },
      { key: 'beer', label: 'Bubbly, rosé & seltzers' },
      { key: 'liquor', label: 'Cocktails & spirits' },
      { key: 'mixers', label: 'Mixers & extras' },
      { key: 'review', label: 'Review' },
    ],
    beerStepBlurb:
      'Champagne, rosé, hard seltzers — pick what your girls actually drink.',
    liquorStepBlurb:
      'Bottles for cocktails, plus pitcher kits if you want it Pinterest-perfect with zero work.',
    mixersStepBlurb:
      'Juices, garnishes, glassware, ice, and the little extras that make the photos look good.',
    basicsHeadline: "Let's set up the weekend.",
    basicsBlurb:
      'Both optional. You can edit anytime — your per-guest price updates live.',
    groupSizeLabel: 'Group size',
    groupSizeUnit: 'guests',
    defaultPeople: 8,
    reviewHeadline: 'Review & lock it in.',
    successQuoteHeadline: 'Quote on the way! 🥂',
    successCheckoutHeadline: "We've got you, MOH.",
    emailNotice:
      "We'll never spam you. TABC-licensed alcohol retailer — must be 21+ at delivery.",
  },
};
