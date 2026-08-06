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
    'Beer, liquor, cocktail kits and ice delivered cold to your Airbnb, hotel, party bus, or Lake Travis boat dock. Order in 30 seconds. Reschedule free up to 6 hours out.',
  heroBullets: [
    'Delivered ice-cold to your Airbnb, hotel, party bus, or boat dock',
    'Cocktail kits pre-batched for the boat — nobody plays bartender',
    'One link, the whole crew orders, split pay — no Venmo chasing',
    'Order in 30 seconds · 48-hour notice locks guaranteed pricing',
  ],
  heroImage: '/images/ppc/ppc-ccs-238.jpg',
  heroImages: [
    {
      src: '/images/ppc/ppc-ccs-238.jpg',
      alt: 'Bachelor party group on a Lake Travis boat stocked by Party On Delivery',
    },
    {
      src: '/images/hero/hero-boat-party.webp',
      alt: 'Lake Travis boat party with cold drinks delivered to the dock',
    },
    {
      src: '/images/gallery/sunset-champagne-pontoon.webp',
      alt: 'Sunset toast on a Lake Travis pontoon',
    },
  ],
  heroTrustBadges: ['✓ TABC-licensed', '✓ 500+ Austin bach groups', '★ 5.0 on Google', '✓ Split pay built-in'],

  trustStats: [
    { stat: '500+', label: 'Austin bach & boat groups served' },
    { stat: '5.0★', label: 'Google rating — see reviews below' },
    { stat: '$0', label: 'Split-pay fees — each guy pays his share' },
    { stat: '48-hr', label: 'Notice locks guaranteed pricing' },
  ],

  painHeadline: "You didn't fly to Austin to babysit a Costco run.",
  painBody:
    'Drop one link in the group chat — everyone adds what they want, splits the tab, and we deliver it cold to every stop. Cocktail kits for the boat. Ice already in the cooler. Your only job is to show up.',

  packagesEyebrow: 'CURATED FOR AUSTIN BACH GROUPS',
  packagesHeadline: "Pick a package. We'll do the rest.",
  packagesBlurb:
    'Built around the trips Austin groups actually take — Lake Travis boat days, Rainey Street nights, downtown hotels. Every package scales to your headcount with a live per-person price.',
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
    // Footprint note: keep this row inside the confirmed delivery footprint
    // (Westlake / Bee Cave / Lakeway) — do NOT name Dripping Springs,
    // Wimberley, or Spicewood on this paid landing page.
    { area: 'Bachelor Houses & Estates', detail: 'Westlake, Bee Cave, Lakeway — straight to the big house' },
  ],
  venuesImage: '/images/hero/bach-hero-party-bus.webp',

  reviewsEyebrow: '★★★★★ 5.0 ON GOOGLE',
  reviewsHeadline: 'The crew gets the credit. We just deliver.',
  // Real Google reviews — harvested 2026-06-12 from the Business Profile
  // reviews manager (the API sync only mirrors 5; see gbp.ts). Picked for
  // bachelor-page message match: Lake Travis boat day, weekend rental
  // stock-up, fly-in groups.
  reviews: [
    {
      quote:
        'Used for a boat day on Lake Travis and it made it SO easy! Just showed up and our cooler was stocked with ice and all of the drinks we ordered ahead of time. 10/10 would recommend',
      author: 'Rivajoy Giannitsis',
      detail: '★★★★★ via Google · Lake Travis boat day',
    },
    {
      quote:
        'Awesome delivery service! Drinks showed up cold and on time for stocking our rental for the weekend',
      author: 'Bayne Pettinger',
      detail: '★★★★★ via Google · weekend rental stock-up',
    },
    {
      quote:
        'Fast, fair and convenient. Very hard to get all 3 in any business. Will use again for our next visit to Austin!',
      author: 'Tim Nappi',
      detail: '★★★★★ via Google · visiting Austin',
    },
  ],

  // Pain-point mirror (above the final CTA) — the bach-group anxiety is
  // hauling cases across a marina in July. Nikita's review says it verbatim.
  featuredReview: {
    reviewId: 'nikita-patel',
    reassurance: 'Cooler iced, labeled with your crew’s name, waiting at the dock.',
  },

  // Video section (above the FAQ) — enable once the bach video is uploaded:
  //   video: buildBachVideo({ videoId: '<id>', uploadDate: '<YYYY-MM-DD>', duration: 'PT4M40S' }),
  // Chapters + copy live in ./bachVideo.ts, shared with the bachelorette lander.

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
      q: 'How does Lake Travis boat-dock delivery work?',
      a: "Tell us your marina and departure time — Volente, Lakeway, Hurst Harbor, Emerald Point, Rough Hollow, all of them. We coordinate with your captain and have the cooler loaded dockside before you push off. Lake runs carry a $250 minimum.",
    },
    {
      q: 'How does group ordering and split pay work?',
      a: 'One link in the group chat. Everyone adds their own drinks to the same cart, then each person pays for exactly what they added — separate cards, separate receipts, zero IOUs. We bundle it and deliver everything together.',
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

  popularProducts: {
    heading: 'Crowd-pleasers for the bach weekend',
    intro:
      'The bottles and cans Austin bachelor groups add most — order any of them straight to the boat, Airbnb, or hotel.',
    items: [
      {
        handle: 'pinthouse-electric-jellyfish-16oz-4-pack-can',
        name: 'Pinthouse Electric Jellyfish IPA',
        blurb:
          "Austin's cult-favorite hazy IPA in 16oz cans — the local pour that makes a boat cooler feel like a brewery run.",
        price: '$19.99',
      },
      {
        handle: 'karbach-love-street-blonde-18-pack-12oz-can',
        name: 'Karbach Love Street • 18-Pack',
        blurb:
          'Crushable Texas blonde by the 18-pack — the easy all-day beer for a Lake Travis dock day or Rainey pregame.',
        price: '$26.99',
      },
      {
        handle: 'aperol-spritz-party-pitcher-kit-16-drinks',
        name: 'Aperol Spritz Kit • Serves 16',
        blurb:
          'Pre-batched spritz for 16 so nobody plays bartender at the Airbnb — pour, add ice, done.',
        price: '$67.99',
      },
      {
        handle: 'pineapple-cup-with-straw',
        name: 'Pineapple Cup with Straw',
        blurb:
          'The boat-day photo op — tropical cups that turn any drink into a bachelor-trip highlight reel.',
        price: '$2.49',
      },
    ],
  },

  finalCtaHeadline: 'Lock it in.',
  finalCtaHeadlineAccent: 'Then go enjoy the trip you planned.',
  finalCtaSubhead:
    'Most groups book 1–3 weeks out and Lake Travis weekends sell out first. Reschedule free up to 6 hours before delivery — so lock the date now and tweak later.',
  finalCtaImage: '/images/hero/bach-hero-brewery.webp',

  phoneDisplay: PHONE_DISPLAY,
  phoneTel: 'tel:7373719700',
  primaryCtaHref: '#builder',
  ctaText: 'BUILD YOUR BACH PACKAGE →',

  planningCallUrl: 'https://123.partyondelivery.com/planning-call',
  secondaryCtaText: 'SCHEDULE A 10-MIN CALL →',

  quoteInbox: 'info@partyondelivery.com',

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
