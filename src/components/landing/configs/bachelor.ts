import type { LandingConfig } from '../types';

const PHONE_DISPLAY = '(737) 371-9700';

export const bachelorConfig: LandingConfig = {
  slug: 'austin-bachelor-party-delivery',
  // Title trimmed to <60 chars so it doesn't truncate in SERPs.
  metaTitle: 'Austin Bachelor Party Alcohol Delivery | Party On Delivery',
  metaDescription:
    'Beer, liquor, mixers and ice delivered cold to your Airbnb, hotel, party bus or Lake Travis dock. Group ordering, split pay, cocktail kits. 500+ Austin groups served.',
  ogImage: '/images/services/bach-parties/bachelor-party-epic.webp',

  theme: {
    primary: '#F2D34F',
    primaryHover: '#FACC15',
    primaryText: '#0A1F33',
    navy: '#0A1F33',
    cream: '#FAF6EE',
    blue: '#0B74B8',
  },
  eventLabel: 'AUSTIN BACHELOR PARTY ALCOHOL DELIVERY',
  audienceTitleCase: 'Bachelor Party',

  heroEyebrow: 'AUSTIN BACHELOR PARTY ALCOHOL DELIVERY',
  heroHeadline: 'Stocked & Ice-Cold',
  heroHeadlineAccent: 'Before The Groom Lands.',
  heroSubhead:
    "Beer, liquor, mixers and ice delivered cold to your Airbnb, hotel, party bus, or Lake Travis dock. Skip the store run. Order in 30 seconds — we'll handle the rest.",
  heroBullets: [
    'Beer, liquor, seltzers & cocktail kits — delivered ice-cold',
    'Group ordering & split pay — no Venmo chaser',
    'Airbnb, hotel, boat dock, party bus — wherever you land',
    'Order in 30 seconds. 48-hour notice = guaranteed pricing.',
  ],
  heroImage: '/images/services/bach-parties/bachelor-party-epic.webp',
  // Hero badges removed — trustStats below handle this so the hero stays uncluttered.
  heroTrustBadges: [],

  trustStats: [
    { stat: 'Group ordering', label: 'Whole crew adds to one cart' },
    { stat: 'Split pay', label: 'Each person pays their share' },
    { stat: 'Cocktail kits', label: 'Pre-mixed for the boat' },
    { stat: '500+', label: 'Groups served' },
  ],

  painHeadline: "You didn't fly to Austin to babysit a Costco run.",
  painBody:
    'Drop one link in the group chat — everyone adds what they want, splits the tab, and we deliver it cold. Cocktail kits for the boat. Ice already in the cooler. Done.',

  packagesEyebrow: 'CURATED FOR AUSTIN BACH GROUPS',
  packagesHeadline: "Pick a package. We'll do the rest.",
  packagesBlurb:
    'Built around the trips groups actually take in Austin — Lake Travis, Rainey Street, downtown hotels.',
  packages: [
    {
      name: 'Austin Bach Starter',
      price: '$299',
      save: 'Save $50',
      serves: 'Pregame for 6–8',
      blurb: 'Everything you need before hitting 6th Street or Rainey.',
      items: [
        "Tito's Vodka (750ml)",
        'Don Julio Blanco (750ml)',
        'White Claw 6-pack',
        'Cranberry, OJ, lime juice, ice',
        'Cups, napkins, opener',
      ],
      image: '/images/services/bach-parties/late-night-party-supplies.webp',
    },
    {
      name: 'Lake Travis Pack',
      price: '$499',
      save: 'Save $75',
      serves: 'Boat party for 10–12',
      blurb: 'Built for sun, dock, and 8 hours on the water.',
      items: [
        "2× Tito's Vodka (750ml)",
        'Casamigos Blanco (750ml)',
        '12× White Claw + 12× Truly',
        'Full mixer set + ice packs',
        'Waterproof cooler included',
      ],
      image: '/images/gallery/sunset-champagne-pontoon.webp',
      featured: true,
    },
    {
      name: 'Rainey Street Crawler',
      price: '$399',
      save: 'Save $60',
      serves: 'Pre-game for 8–10',
      blurb: 'Pre-game heavy, walk to the bars, stumble back to the Airbnb.',
      items: [
        "Tito's Vodka (750ml)",
        'Espolòn Tequila (750ml)',
        'Jameson Whiskey (750ml)',
        '18× assorted seltzers',
        'Energy drinks + mixers',
      ],
      image: '/images/hero/bach-hero-rainey.webp',
    },
  ],
  customLine: "Need something custom? Call us — we'll build it.",

  stepsHeadline: 'One link. Everyone orders. We deliver it all together.',
  steps: [
    {
      n: '1',
      title: "Open your group's dashboard",
      teaser: 'One link, the whole group inside.',
      body:
        "The trip organizer gets one shared link. Drop it in the group chat and that's it — no apps to download, no logins, no chasing guys for Venmo. Everyone who opens the link sees the same dashboard, the same cart, the same delivery details, in real time.",
      shortBody: 'Crew adds to one shared cart.',
    },
    {
      n: '2',
      title: "Everyone adds what they're drinking",
      teaser: 'Each guy stocks his own pile.',
      body:
        'The Jameson guy adds his Jameson. The Truly drinkers grab their seltzers. Want cocktails at the Airbnb without anyone playing bartender? Toss in a pre-batched cocktail kit. Everyone sees who added what — no duplicates, no forgotten favorites.',
      shortBody: 'Everyone picks their drinks.',
    },
    {
      n: '3',
      title: 'Split it across the trip',
      teaser: 'Multiple stops, one group order.',
      body:
        'Boat day Saturday on Lake Travis? Airbnb on Rainey Friday night? Set up a separate order for each stop, each with its own address, time, and deadline. Same group, same dashboard, different drop-offs — we keep them all coordinated so the cooler hits the dock the moment you do.',
      shortBody: 'Multiple stops, one order.',
    },
    {
      n: '4',
      title: 'Each guy pays his share — we deliver it all together',
      teaser: 'Split the bill, not the trip.',
      body:
        "When everyone's done adding, each guy checks out for just what he added — separate cards, separate receipts, no IOUs. We bundle the whole group's order behind the scenes and bring it cold to every stop, on time. One trip planned. Eight guys happy. Zero math.",
      shortBody: 'Each guy pays. We deliver cold.',
    },
  ],

  venuesEyebrow: 'EVERYWHERE BACH GROUPS GO',
  venuesHeadline: "Hotel lobby. Boat dock. Party bus. We'll find you.",
  venues: [
    { area: 'Downtown Hotels', detail: 'Hilton, Fairmont, JW Marriott — lobby drop-off' },
    { area: 'Rainey Street Airbnbs', detail: 'Front-door delivery, walking to bars' },
    { area: 'Lake Travis Docks', detail: 'Loaded straight onto your boat or pontoon' },
    { area: 'Party Buses & Limos', detail: 'Coordinate with your driver, we time it perfectly' },
    { area: 'East Austin Breweries', detail: 'Add bottles to your brewery hop' },
    { area: 'Bachelor Houses & Ranches', detail: 'Wimberley, Dripping Springs, Spicewood' },
  ],
  venuesImage: '/images/hero/bach-hero-party-bus.webp',

  reviewsEyebrow: '★★★★★ 5.0 ON GOOGLE',
  reviewsHeadline: 'The crew gets the credit. We just deliver.',
  reviews: [
    {
      quote:
        "I would recommend this service to anyone who is going on a boat cruise! It was so nice to just show up to the boat and have all our cocktail ingredients and seltzers there. The recipes are on the pitcher and are easy for anyone to make! Prices are very reasonable, and anything you have left over you can take home!",
      author: 'Perla Albiter',
      detail: '★★★★★ via Google',
    },
    {
      quote:
        "Party On Delivery was amazing to work with! They had ample availability for delivery time slots, were communicative throughout the whole process, and got us everything we needed right to our door. It's great that they have mixers, alcohol, hydration packets, and food — all in one spot. Can't recommend enough!",
      author: 'Jodi Hiller',
      detail: '★★★★★ via Google',
    },
    {
      quote:
        "Party on Delivery is a fantastic treasure! They truly made our UT tailgate happen — delivered all our liquor and kegs and brought tables and chairs for our guests. Communication was easy and they helped me decide on how much alcohol we would need. I highly recommend Party on Delivery to save you time and stress. Very reasonably priced too! You guys rock!",
      author: 'Shannon Crim',
      detail: '★★★★★ via Google',
    },
  ],

  faqHeadline: 'The questions every best man asks.',
  faqs: [
    {
      q: 'How fast can you deliver in Austin?',
      a:
        '48-hour notice is our standard window for guaranteed pricing and cold delivery. Same-day is often possible — call us at ' +
        PHONE_DISPLAY +
        ' to check.',
    },
    {
      q: 'Do you deliver to Lake Travis docks and boats?',
      a: "Yes — Volente, Lakeway, Hurst Harbor, Emerald Point, Rough Hollow, all of them. We'll coordinate with your captain or marina.",
    },
    {
      q: 'What is the order minimum?',
      a: 'Most areas are $100–$150 minimum. Lake Travis and far-out ranches start at $250 to cover the drive.',
    },
    {
      q: 'Are you actually licensed?',
      a: "Yes. We're TABC-licensed, fully insured, and every driver is certified. We card on delivery — non-negotiable.",
    },
    {
      q: 'Can you customize a package?',
      a: "Absolutely. Click 'Build Your Bach Package' or call us. We'll match your group size, taste, and budget.",
    },
    {
      q: 'What if plans change?',
      a: 'We get it — bach plans shift. Reschedule free up to 6 hours before delivery. After that, we work with you.',
    },
  ],

  finalCtaHeadline: 'Lock it in.',
  finalCtaHeadlineAccent: 'Then go enjoy the trip you planned.',
  finalCtaSubhead:
    'Most groups book 1–3 weeks out. Lake Travis weekends fill up fast — get on the calendar now.',
  finalCtaImage: '/images/hero/bach-hero-brewery.webp',

  phoneDisplay: PHONE_DISPLAY,
  phoneTel: 'tel:7373719700',
  primaryCtaHref: '#builder',
  ctaText: 'BUILD YOUR BACH PACKAGE →',

  planningCallUrl: 'https://123.partyondelivery.com/planning-call',
  secondaryCtaText: 'SCHEDULE A 10-MIN CALL →',

  quoteInbox: 'brian@premierpartycruises.com',

  modal: {
    title: 'Build Your Bach Package',
    ctaPrimary: 'BUILD YOUR BACH PACKAGE →',
    ctaPrimaryShort: 'BUILD MY PACKAGE',
    steps: [
      { key: 'basics', label: 'Trip basics' },
      { key: 'beer', label: 'Beer & seltzers' },
      { key: 'liquor', label: 'Liquor & cocktail kits' },
      { key: 'mixers', label: 'Mixers & supplies' },
      { key: 'review', label: 'Review' },
    ],
    beerStepBlurb:
      'Stock the Airbnb fridge or load the boat cooler. Most groups grab 2–3 packs per 4 people.',
    liquorStepBlurb:
      'Bottles for shots and mixed drinks, plus pitcher kits if you want zero work.',
    mixersStepBlurb:
      "The stuff everyone forgets — mixers, cups, ice, pong gear.",
    basicsHeadline: "Let's set up the trip.",
    basicsBlurb:
      'Both optional. You can edit anytime — your per-person price updates live.',
    groupSizeLabel: 'Group size',
    groupSizeUnit: 'people',
    defaultPeople: 8,
    reviewHeadline: 'Review & lock it in.',
    successQuoteHeadline: 'Quote on the way!',
    successCheckoutHeadline: "We're on it.",
    emailNotice:
      "We'll never spam you. TABC-licensed alcohol retailer — must be 21+ at delivery.",
  },
};
