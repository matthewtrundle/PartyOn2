/**
 * Canonical pool of REAL customer reviews + the aggregate Google-rating claim.
 * Single source of truth for every social-proof surface: the landing-page
 * rating strips, the review marquee ("Review Storm"), the pain-point mirror
 * quotes, and the /reviews Wall of Love page.
 *
 * HOUSE RULES (learned the hard way — see configs/corporate.ts history):
 *  - Every quote is a VERBATIM Google review. Never paraphrase. Excerpts must
 *    be exact substrings of the full review (trimming with … is fine).
 *  - No fabricated personas. If a segment needs more reviews, harvest real
 *    ones from the GBP reviews manager (the API sync only mirrors the 5 most
 *    recent — see lib/analytics/gbp.ts). Same workflow as PR #121.
 *  - No reviewer photos exist anywhere in the repo, so avatars are initials
 *    on brand-adjacent colors. Do NOT substitute stock/AI faces — they test
 *    worse than no face at all.
 *
 * This file must stay free of server-only imports (no Prisma) — it is
 * bundled into client landing pages.
 */

/**
 * The aggregate claim shown next to every star strip. Operator-confirmed
 * 2026-08-06: the profile shows 5.0 with 100+ reviews (Allan). The profile
 * itself is the ground truth; update these when it changes. Deliberately
 * "100+", not an exact number, so the claim never overstates — and always
 * render rating + count TOGETHER (a 5.0 with a visible count reads as
 * earned; a bare 5.0 reads as fake — Baymard).
 *
 * NOTE: do NOT emit Schema.org AggregateRating from these — self-serving
 * review markup (rating your own LocalBusiness on your own site) has been
 * ineligible for rich results since 2019 and risks a manual action.
 */
export const GOOGLE_RATING_DISPLAY = '5.0';
export const GOOGLE_REVIEW_COUNT_DISPLAY = '100+';

/** Event segment a review speaks to (used for message-matched ordering). */
export type ReviewSegment =
  | 'bachelor'
  | 'bachelorette'
  | 'wedding'
  | 'corporate'
  | 'boat'
  | 'general';

export type CustomerReview = {
  /** Stable slug id — referenced from landing configs (featuredReview). */
  id: string;
  author: string;
  /** Full review text, verbatim from Google. */
  quote: string;
  /**
   * Short excerpt for marquee tiles. Verbatim: every run of text between …
   * marks is an exact substring of `quote` (… marks an omission, standard
   * quoting practice — enforced by __tests__/reviews.test.ts).
   */
  excerpt: string;
  /**
   * The pain-point phrase inside `excerpt` to visually emphasize — the exact
   * anxiety a visitor arrives with (lugging, running around town, on time…).
   * Must be an exact substring of `excerpt`.
   */
  highlight?: string;
  /** Context line, e.g. "Lake Travis boat day". */
  context: string;
  /** Segments this review speaks to, most specific first. */
  segments: ReviewSegment[];
  /** Initials-avatar background (brand-adjacent palette, deterministic). */
  avatarBg: string;
  /**
   * Optional self-hosted reviewer photo under /public, e.g.
   * "/images/reviewers/nikita-patel.webp". Harvested from the reviewer's
   * public Google profile — see HARVEST.md for the workflow and rules
   * (real personal photos only: never default-avatar silhouettes, logos,
   * or stock/AI faces; remove immediately if a reviewer asks). Every
   * surface falls back to initials when unset, and a repo test fails if
   * the path is set but the file is missing.
   */
  photoSrc?: string;
};

/**
 * All reviews below were already published verbatim elsewhere in this repo
 * (landing configs, /weddings, /holiday-runner-up, /partners/*) — provenance
 * noted per entry. Harvested from the Google Business Profile reviews manager.
 */
export const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    // configs/bachelor.ts (harvested 2026-06-12)
    id: 'rivajoy-giannitsis',
    author: 'Rivajoy Giannitsis',
    quote:
      'Used for a boat day on Lake Travis and it made it SO easy! Just showed up and our cooler was stocked with ice and all of the drinks we ordered ahead of time. 10/10 would recommend',
    excerpt:
      'Just showed up and our cooler was stocked with ice and all of the drinks we ordered ahead of time.',
    highlight: 'our cooler was stocked with ice',
    context: 'Lake Travis boat day',
    segments: ['boat', 'bachelor'],
    avatarBg: '#F2D34F',
  },
  {
    // configs/bachelor.ts
    id: 'bayne-pettinger',
    author: 'Bayne Pettinger',
    quote:
      'Awesome delivery service! Drinks showed up cold and on time for stocking our rental for the weekend',
    excerpt:
      'Drinks showed up cold and on time for stocking our rental for the weekend',
    highlight: 'cold and on time',
    context: 'Weekend rental stock-up',
    segments: ['bachelor', 'general'],
    avatarBg: '#A8E0B0',
  },
  {
    // configs/bachelor.ts
    id: 'tim-nappi',
    author: 'Tim Nappi',
    quote:
      'Fast, fair and convenient. Very hard to get all 3 in any business. Will use again for our next visit to Austin!',
    excerpt:
      'Fast, fair and convenient. Very hard to get all 3 in any business.',
    highlight: 'Fast, fair and convenient',
    context: 'Visiting Austin',
    segments: ['general'],
    avatarBg: '#7FC8F5',
  },
  {
    // configs/bachelorette.ts
    id: 'qiana-valentine',
    author: 'Qiana Valentine',
    quote:
      "Party On Delivery was amazing! Took one big part off of my plate for my sister's bachelorette weekend. I didn't have to worry about drinks at all. Highly recommend them for all needs. Ordering online in advance and having what we needed waiting for us was perfect! 10/10",
    excerpt:
      "Took one big part off of my plate for my sister's bachelorette weekend. I didn't have to worry about drinks at all.",
    highlight: 'one big part off of my plate',
    context: 'Bachelorette weekend',
    segments: ['bachelorette'],
    avatarBg: '#F5B0C5',
  },
  {
    // partners/inn-cahoots (fuller version of the configs/bachelorette.ts quote)
    id: 'austin-bach-babes',
    author: 'Austin Bach Babes',
    quote:
      'Party On Delivery made our weekend absolutely effortless and so much fun! They brought all our alcohol right to our Airbnb! No stress, no running around, just pure convenience! We added the Skinnyrita drink package and it even came with a dispenser so our group could keep the drinks flowing. If you want that luxury, full-service party vibe brought to you anywhere... pool, lake, backyard, you name it — this is the team to call!',
    excerpt:
      'They brought all our alcohol right to our Airbnb! No stress, no running around, just pure convenience!',
    highlight: 'No stress, no running around',
    context: 'Bachelorette Airbnb',
    segments: ['bachelorette'],
    avatarBg: '#F5B0C5',
  },
  {
    // configs/bachelorette.ts
    id: 'perla-albiter',
    author: 'Perla Albiter',
    quote:
      'I would recommend this service to anyone who is going on a boat cruise! It was so nice to just show up to the boat and have all our cocktail ingredients and seltzers there. The recipes are on the pitcher and are easy for anyone to make! Prices are very reasonable, and anything you have left over you can take home!',
    excerpt:
      'It was so nice to just show up to the boat and have all our cocktail ingredients and seltzers there.',
    highlight: 'just show up to the boat',
    context: 'Boat cruise',
    segments: ['boat', 'bachelorette'],
    avatarBg: '#7FC8F5',
  },
  {
    // app/weddings/page.tsx
    id: 'nick-gorman',
    author: 'Nick Gorman',
    quote:
      'Party on Delivery did an amazing job! They saved us from the stress of delivering our alcohol to our wedding and provided a clear list on what was being delivered based off what we chose. Everything arrived on time and it was quick and easy. I would highly recommend them!',
    excerpt:
      'They saved us from the stress of delivering our alcohol to our wedding… Everything arrived on time and it was quick and easy.',
    highlight: 'the stress of delivering our alcohol to our wedding',
    context: 'Austin wedding',
    segments: ['wedding'],
    avatarBg: '#E8B87F',
  },
  {
    // app/weddings/page.tsx
    id: 'paul-puchta',
    author: 'Paul Puchta',
    quote:
      'We used Party on Delivery for our wedding reception and they were perfect from start to finish. Their pricing was fair, transparent, and easy to follow. On the day of our event, they arrived on time and helped prep the keg buckets and ice, taps, etc. They were very professional throughout the whole process, and I would recommend them to anyone looking for alcohol delivery services. Thank you again!',
    excerpt:
      'On the day of our event, they arrived on time and helped prep the keg buckets and ice, taps, etc.',
    highlight: 'helped prep the keg buckets and ice',
    context: 'Wedding reception',
    segments: ['wedding'],
    avatarBg: '#A8E0B0',
  },
  {
    // app/weddings/page.tsx (Local Guide)
    id: 'tatianna-ramon',
    author: 'Tatianna Ramon',
    quote:
      "I met Allan at an Open House at Ranch Austin and his team has been very communicative and helpful while placing an alcohol order for my wedding clients. They were flexible and made the process easy! They delivered to the venue and even offered to chill some of the wine and beer for us. I'd recommend them to anyone and will definitely be using their services again!",
    excerpt:
      'They delivered to the venue and even offered to chill some of the wine and beer for us.',
    highlight: 'delivered to the venue',
    context: 'Wedding planner · Local Guide',
    segments: ['wedding'],
    avatarBg: '#7FC8F5',
  },
  {
    // app/weddings/page.tsx
    id: 'michelle-guillot',
    author: 'Michelle Guillot',
    quote:
      'We used party on delivery for our wedding reception and everything was a breeze from the ordering process, to the delivery, to the pick up!!! We dealt with one of the owners, Brian, who was fun, courteous, prompt and made sure all the details were worked out and that we were taken care of from start to finish. It was nice not to have to worry about running around town in Austin traffic to get all the booze we needed and just to have it show up on time without lifting a finger!!! I highly recommend them for all your party needs!!!!! Just do it and save yourself the hassle!',
    excerpt:
      'It was nice not to have to worry about running around town in Austin traffic to get all the booze we needed',
    highlight: 'running around town in Austin traffic',
    context: 'Wedding reception',
    segments: ['wedding'],
    avatarBg: '#E8B87F',
  },
  {
    // app/weddings/page.tsx (Local Guide)
    id: 'james-burt',
    author: 'James Burt',
    quote:
      "Party On Delivery is an awesome concept with top-notch customer service. We've been working with them for a matter of months now, and the fact they make everything so seamless makes everybody's life a breeze when it comes to party planning, which we know can be very stressful with all the moving parts. I highly recommend Party On Delivery for anybody who wants to take the stress out of the alcohol ordering. Keep up the good work, Allan and Brian!",
    excerpt:
      "the fact they make everything so seamless makes everybody's life a breeze when it comes to party planning",
    highlight: 'everything so seamless',
    context: 'Event pro · Local Guide',
    segments: ['corporate', 'general'],
    avatarBg: '#7FC8F5',
  },
  {
    // partners/inn-cahoots
    id: 'mary-h',
    author: 'Mary H.',
    quote:
      "Party on Delivery did a great job helping me plan drinks for my son's wedding reception, setting us up with a good bartender, delivering the drinks as ordered and refunding unopened cases afterwards. It was a pleasure working with Allan, who made the whole process so easy for me.",
    excerpt:
      'delivering the drinks as ordered and refunding unopened cases afterwards',
    highlight: 'refunding unopened cases afterwards',
    context: "Son's wedding reception",
    segments: ['wedding'],
    avatarBg: '#F5B0C5',
  },
  {
    // partners/inn-cahoots
    id: 'jodi-hiller',
    author: 'Jodi Hiller',
    quote:
      "Party On Delivery was amazing to work with! They had ample availability for delivery time slots, were communicative throughout the whole process, and got us everything we needed right to our door. It's great that they have mixers, alcohol, hydration packets, and food! All in one spot. Can't recommend enough!",
    excerpt:
      "It's great that they have mixers, alcohol, hydration packets, and food! All in one spot.",
    highlight: 'All in one spot',
    context: 'Group weekend',
    segments: ['general'],
    avatarBg: '#F2D34F',
  },
  {
    // partners/premier-party-cruises
    id: 'kirby-parsons',
    author: 'Kirby Parsons',
    quote:
      "Must do if going on premier disco cruise in ATX!!! So easy, didn't have to bring anything with us and it was all set up by the time we even arrived. Needed no communication with company on day of they just know what they're doing!",
    excerpt:
      "So easy, didn't have to bring anything with us and it was all set up by the time we even arrived.",
    highlight: 'all set up by the time we even arrived',
    context: 'Disco cruise',
    segments: ['boat'],
    avatarBg: '#A8E0B0',
  },
  {
    // partners/premier-party-cruises
    id: 'chop-choplin',
    author: 'Chop Choplin',
    quote:
      'Working with Party on Delivery for our 50 person boat party was a massive game changer. They had everything we could possibly need to order and communication was on point! Having everything delivered to the boat, drinks iced, and ready to go when we got there was such a pleasure.',
    excerpt:
      'Working with Party on Delivery for our 50 person boat party was a massive game changer.',
    highlight: '50 person boat party',
    context: '50-person boat party',
    segments: ['boat', 'corporate'],
    avatarBg: '#E8B87F',
  },
  {
    // partners/premier-party-cruises
    id: 'casey-ancar',
    author: 'Casey Ancar',
    quote:
      'I booked Premier Party for my 30th birthday and it was a blast! My party of 14 booked The 25 ppl boat to have more space. The Party On delivery service was soooo convenient. They delivered my drink order straight to the boat along with ice and cups.',
    excerpt:
      'They delivered my drink order straight to the boat along with ice and cups.',
    highlight: 'straight to the boat',
    context: '30th birthday cruise',
    segments: ['boat'],
    avatarBg: '#F2D34F',
  },
  {
    // partners/premier-party-cruises
    id: 'nikita-patel',
    author: 'Nikita Patel',
    quote:
      'We picked them for delivery when we did the ATX Party Boats. We got on board, our drinks were in a cooler with our name on it, on ice. My group and I did not have to worry about lugging anything to the boat in the Texan heat.',
    excerpt:
      'My group and I did not have to worry about lugging anything to the boat in the Texan heat.',
    highlight: 'lugging anything to the boat in the Texan heat',
    context: 'ATX Party Boats',
    segments: ['boat', 'bachelor'],
    avatarBg: '#7FC8F5',
  },
  {
    // app/holiday-runner-up/page.tsx
    id: 'shannon-crim',
    author: 'Shannon Crim',
    quote:
      'Party on Delivery is a fantastic treasure!! They truly made our company UT tailgate happen! They delivered all our liquor and kegs and brought tables and chairs for our guests! Communication was easy and they helped me decide on how much alcohol we would need!! I highly recommend Party on Delivery to save you time and stress!! Very reasonably priced too!',
    excerpt:
      'Communication was easy and they helped me decide on how much alcohol we would need!!',
    highlight: 'helped me decide on how much alcohol we would need',
    context: 'Company UT tailgate',
    segments: ['corporate'],
    avatarBg: '#F2D34F',
  },
  {
    // partners/mobile-bartenders (longer variant on /holiday-runner-up)
    id: 'dane-witbeck',
    author: 'Dane Witbeck',
    quote:
      "For the first time in 10 years, I didn't have to buy the booze for the company boat party on Lake Travis. This is the best kept secret on the whole lake. 100% coming back year after year. Thank you POD!",
    excerpt:
      "For the first time in 10 years, I didn't have to buy the booze for the company boat party on Lake Travis.",
    highlight: "I didn't have to buy the booze",
    context: 'Company party · Lake Travis',
    segments: ['corporate', 'boat'],
    avatarBg: '#A8E0B0',
  },
  {
    // app/holiday-runner-up/page.tsx
    id: 'chandler-little',
    author: 'Chandler Little',
    quote:
      'Reliable, fast, and wonderful service was provided for my corporate team building event. Will definitely be using Party on Delivery again!',
    excerpt:
      'Reliable, fast, and wonderful service was provided for my corporate team building event.',
    highlight: 'corporate team building event',
    context: 'Team-building event',
    segments: ['corporate'],
    avatarBg: '#E8B87F',
  },
  {
    // GBP harvest 2026-08-07 (3 weeks ago)
    id: 'molly-meredith',
    author: 'Molly Meredith',
    quote:
      'Party On Delivery made getting drinks for our company event so easy. Vic handled our delivery and was fantastic, right on time and so accommodating when we needed to work around our event schedule. Everything arrived exactly as ordered and ready to go. Great service and a great experience overall, would definitely order from them again for our next company outing!',
    excerpt:
      'made getting drinks for our company event so easy',
    highlight: 'our company event so easy',
    context: 'Company event',
    segments: ['corporate'],
    avatarBg: '#F2D34F',
  },
  {
    // GBP harvest 2026-08-07 (4 months ago)
    id: 'christian-jackman',
    author: 'Christian Jackman',
    quote:
      'This was my first time using this company to stock our company party. The price was reasonable, the communication was easy, and they showed up exactly as promised. We\'re happy to have this local option for our events.',
    excerpt:
      'The price was reasonable, the communication was easy, and they showed up exactly as promised.',
    highlight: 'showed up exactly as promised',
    context: 'Company party',
    segments: ['corporate'],
    avatarBg: '#F5B0C5',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'patti-doner',
    author: 'Patti Doner',
    quote:
      'Party on Delivery made our pickleball event a breeze! Their team was incredibly friendly and easy to work with from start to finish. It was such a relief not to worry about transporting those big sports coolers – they handled everything! They arrived, set up the coolers perfectly with all the drinks and ice, and then came back to pick them up seamlessly. The entire process was completely stress-free, allowing us to focus on the event itself. Highly recommend for any event needs!',
    excerpt:
      'It was such a relief not to worry about transporting those big sports coolers',
    highlight: 'not to worry about transporting those big sports coolers',
    context: 'Pickleball event',
    segments: ['corporate', 'general'],
    avatarBg: '#7FC8F5',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'eli-green',
    author: 'Eli Green',
    quote:
      'Easy communication, good prices, on time delivery, worked perfect for our wedding!',
    excerpt:
      'on time delivery, worked perfect for our wedding!',
    highlight: 'worked perfect for our wedding',
    context: 'Austin wedding',
    segments: ['wedding'],
    avatarBg: '#A8E0B0',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'rachel-watkins',
    author: 'Rachel Watkins',
    quote:
      'Party On is awesome! We used them for alcohol delivery to a party boat we went on for a bachelorette party. It was so easy, the rep even recommended drinks and how much to get for our group size. We showed up to the boat and our alcohol was ready to go in a cooler. Highly recommend!',
    excerpt:
      'the rep even recommended drinks and how much to get for our group size',
    highlight: 'how much to get for our group size',
    context: 'Bachelorette party boat',
    segments: ['bachelorette', 'boat'],
    avatarBg: '#E8B87F',
  },
  {
    // GBP harvest 2026-08-07 (11 months ago)
    id: 'kori-hickman',
    author: 'Kori Hickman',
    quote:
      'It was easily the most fun thing we did on our bachelorette trip!!! It was the highlight and all the girls had a blast. We loved getting the alcohol delivered to the boat. The convenience of the alcohol delivery made it so easy for our group! Would HIGHLY recommend for any batch parties!!!',
    excerpt:
      'The convenience of the alcohol delivery made it so easy for our group!',
    highlight: 'made it so easy for our group',
    context: 'Bachelorette trip',
    segments: ['bachelorette', 'boat'],
    avatarBg: '#F2D34F',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'emily-hart',
    author: 'Emily Hart',
    quote:
      'We celebrated my sister’s bachelorette party on this iconic boat and we had an absolute blast! I highly recommend using their free alcohol delivery service. It made it so easy for us. The staff on and off the boat were super friendly and ensured we had a blast. I would recommend this to anyone going to Austin looking for a fun boat day with their group.',
    excerpt:
      'I highly recommend using their free alcohol delivery service. It made it so easy for us.',
    highlight: 'free alcohol delivery service',
    context: 'Sister\'s bachelorette',
    segments: ['bachelorette', 'boat'],
    avatarBg: '#F5B0C5',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'michelle-coffey',
    author: 'Michelle Coffey',
    quote:
      'Party on Delivery was just what we needed for our Austin TX bachelorette party! Communication was awesome throughout the planning process and the team at POD made sure we received everything we wanted (and made suggestions for items not available). Delivery service was provided both to our Air BnB as well as the lake where they provide party boat cruises! We didn’t think twice about calculating uber costs for alcohol/ food pickup the whole weekend! POD took care of us from beginning to end and Id highly recommend them for your upcoming trip to the Austin area!',
    excerpt:
      'POD took care of us from beginning to end',
    highlight: 'took care of us from beginning to end',
    context: 'Austin bachelorette weekend',
    segments: ['bachelorette', 'boat'],
    avatarBg: '#7FC8F5',
    photoSrc: '/images/reviewers/michelle-coffey.webp',
  },
  {
    // GBP harvest 2026-08-07 (3 weeks ago)
    id: 'tiffany-rachunek',
    author: 'Tiffany Rachunek',
    quote:
      'They went above and beyond with my request!! I surprised my fiancé with a keg delivered to her bachelorette party and it was a hit! 10/10 would recommend this company!!!',
    excerpt:
      'a keg delivered to her bachelorette party and it was a hit!',
    highlight: 'a keg delivered to her bachelorette party',
    context: 'Bachelorette surprise',
    segments: ['bachelorette'],
    avatarBg: '#A8E0B0',
    photoSrc: '/images/reviewers/tiffany-rachunek.webp',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'shelly-fera',
    author: 'Shelly Fera',
    quote:
      'This service was amazing. It was easy to order and it was delivered to our boat in the cooler all iced and ready for our enjoyment. I would highly recommend. Saved me the time, no need to shop, hauling to boat or set up.',
    excerpt:
      'Saved me the time, no need to shop, hauling to boat or set up.',
    highlight: 'no need to shop, hauling to boat',
    context: 'Boat day',
    segments: ['boat'],
    avatarBg: '#E8B87F',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'bri-costa',
    author: 'Bri Costa',
    quote:
      'Highly recommend Party On Delivery! We used it for the disco cruise and it was the best decision! We didn’t have to worry about getting drinks or big coolers down to the lake ourselves - we got to the boat and everything we ordered was waiting for us in our own personal cooler. It was so convenient! Thank you for thinking of everything!!',
    excerpt:
      'worry about getting drinks or big coolers down to the lake ourselves',
    highlight: 'big coolers down to the lake',
    context: 'Disco cruise',
    segments: ['boat'],
    avatarBg: '#F2D34F',
    photoSrc: '/images/reviewers/bri-costa.webp',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'will-slingerland',
    author: 'will slingerland',
    quote:
      'Highly recommend! Threw a party barge for myself and about 50 of my friends and party on delivery came through with everything we needed- cold and on time. Made life a lot easier not having to transport everything to the lake. Had a great selection and even curated a cart for me that worked great.',
    excerpt:
      'Made life a lot easier not having to transport everything to the lake.',
    highlight: 'not having to transport everything to the lake',
    context: '50-person party barge',
    segments: ['boat'],
    avatarBg: '#F5B0C5',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'miranda-szczesny',
    author: 'Miranda Szczesny',
    quote:
      'Wow what a service! We didn’t have to lift a finger when it came to alcohol delivery for our boat trip. The delivery service was amazing and our drinks were already there by the time our excursion started. The prices were comparable to regular stores so we didn’t feel ripped off. The communication was perfect and I would truly recommend this service!',
    excerpt:
      'our drinks were already there by the time our excursion started',
    highlight: 'already there by the time our excursion started',
    context: 'Boat trip',
    segments: ['boat'],
    avatarBg: '#7FC8F5',
    photoSrc: '/images/reviewers/miranda-szczesny.webp',
  },
  {
    // GBP harvest 2026-08-07 (2 months ago)
    id: 'clelie-scott',
    author: 'Clelie Scott',
    quote:
      'We had fast and friendly delivery of everything we needed. What a great company to use when you’re coming from out of town and you need alcohol for boat day or hiking day or camping day.',
    excerpt:
      'you need alcohol for boat day or hiking day or camping day.',
    highlight: 'boat day or hiking day or camping day',
    context: 'Out-of-town trip',
    segments: ['boat', 'general'],
    avatarBg: '#A8E0B0',
    photoSrc: '/images/reviewers/clelie-scott.webp',
  },
  {
    // GBP harvest 2026-08-07 (11 months ago)
    id: 'patrisha-hartley',
    author: 'Patrisha Hartley',
    quote:
      'Everything we ordered was correct and cold when we arrived. Each individual item, as well as our cooler, was labeled and easy to find. The phone call to help place the order was smooth, polite and professional. They really took care of us and made the whole process easy! It you’re planning any event and you need alcohol delivered, save yourself the stress and a headache and go with them!',
    excerpt:
      'save yourself the stress and a headache and go with them!',
    highlight: 'save yourself the stress and a headache',
    context: 'Group event',
    segments: ['general'],
    avatarBg: '#E8B87F',
  },
  {
    // GBP harvest 2026-08-07 (2 months ago)
    id: 'felix-schulz',
    author: 'Felix Schulz',
    quote:
      'Party On Delivery is an absolutely fantastic liquor delivery service and has completely changed the way I stock up for gatherings and events in Austin. The selection is impressive and covers everything from craft beers and fine wines to premium spirits, so you can always find exactly what you are looking for. The delivery is fast, reliable, and always arrives right on time, which makes planning any party or get together completely stress free. The ordering process is smooth and straightforward, and the team is friendly and professional throughout the entire experience. If you are in Austin and need drinks delivered quickly and conveniently, Party On Delivery is the only service you will ever need.',
    excerpt:
      'makes planning any party or get together completely stress free',
    highlight: 'completely stress free',
    context: 'Austin gatherings',
    segments: ['general'],
    avatarBg: '#F2D34F',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'toni-ann-pierce',
    author: 'Toni Ann Pierce',
    quote:
      'Fast, easy, and exactly what we needed—our drinks showed up right on time and order was correct. The process was hassle free and we highly recommend! Brian was super friendly and helpful!',
    excerpt:
      'our drinks showed up right on time and order was correct. The process was hassle free',
    highlight: 'hassle free',
    context: 'Group order',
    segments: ['general'],
    avatarBg: '#F5B0C5',
  },
  {
    // GBP harvest 2026-08-07 (a month ago)
    id: 'kimberly-brown',
    author: 'Kimberly Brown',
    quote:
      'Easy to order and arrived on time. Definitely more convenient when traveling from out of state and on a time crunch.',
    excerpt:
      'more convenient when traveling from out of state and on a time crunch.',
    highlight: 'traveling from out of state and on a time crunch',
    context: 'Traveling to Austin',
    segments: ['general'],
    avatarBg: '#7FC8F5',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'sarah-thomas',
    author: 'Sarah Thomas',
    quote:
      'Super easy process, I ordered whatever I wanted and the drinks were sitting in a cooler  on ice when I arrived. Prices were also very reasonable. Highly recommend using this service for ease.',
    excerpt:
      'I ordered whatever I wanted and the drinks were sitting in a cooler',
    highlight: 'drinks were sitting in a cooler',
    context: 'Vacation stock-up',
    segments: ['general'],
    avatarBg: '#A8E0B0',
  },
  {
    // GBP harvest 2026-08-07 (3 months ago)
    id: 'roberto-nicolia-jr',
    author: 'Roberto Nicolia, Jr.',
    quote:
      'Order showed up on time, accurate, iced down and ready to go. Process was very easy',
    excerpt:
      'Order showed up on time, accurate, iced down and ready to go.',
    highlight: 'on time, accurate, iced down and ready to go',
    context: 'Delivery order',
    segments: ['general'],
    avatarBg: '#E8B87F',
  },
  {
    // GBP harvest 2026-08-07 (2 years ago)
    id: 'andrew-a',
    author: 'Andrew A.',
    quote:
      'Party on Delivery seriously came through for providing the alcohol for our large party a few weeks ago. Their liquor kits are awesome and the shakers they provide have measurement markers for how much liquor/mixer to add to make the perfect cocktail. They also delivered a freaking keg, with a tap, a barrel, and Ice.\n\nInstead of having to drive to three different stores and borrow a truck to load a keg, I just made one phone call to Party On. Having all of this stuff delivered was so awesome and just took a huge part of the party planning off of my plate so that I could focus on the food, decorations and music. Thank you so much for helping me throw the best party ever!',
    excerpt:
      'took a huge part of the party planning off of my plate',
    highlight: 'off of my plate',
    context: 'Big backyard party',
    segments: ['general'],
    avatarBg: '#F2D34F',
  },
  {
    // GBP harvest 2026-08-07 (a year ago)
    id: 'jack-gillett',
    author: 'Jack Gillett',
    quote:
      'Highly recommend for large groups in Austin! Party On Delivery was incredibly easy to work with and made our weekend completely stress-free. Delivery was right on time, and the staff was friendly and professional.',
    excerpt:
      'made our weekend completely stress-free. Delivery was right on time',
    highlight: 'completely stress-free',
    context: 'Large group weekend',
    segments: ['general'],
    avatarBg: '#F5B0C5',
  },
];

/** Landing-page occasion → segment preference order for review sorting. */
const OCCASION_SEGMENT_PREFERENCE: Record<string, ReviewSegment[]> = {
  bachelor: ['bachelor', 'boat', 'general', 'corporate', 'bachelorette', 'wedding'],
  bachelorette: ['bachelorette', 'boat', 'general', 'wedding', 'bachelor', 'corporate'],
  wedding: ['wedding', 'general', 'bachelorette', 'boat', 'corporate', 'bachelor'],
  corporate: ['corporate', 'general', 'boat', 'wedding', 'bachelor', 'bachelorette'],
  boat: ['boat', 'bachelor', 'bachelorette', 'general', 'corporate', 'wedding'],
};

/**
 * The full pool ordered by relevance to an occasion — best-matched segments
 * first, everything else after (a marquee wants volume, so nothing is
 * filtered out; the match order just controls what the eye lands on first).
 */
export function reviewsForOccasion(occasion: string): CustomerReview[] {
  const preference =
    OCCASION_SEGMENT_PREFERENCE[occasion] ?? OCCASION_SEGMENT_PREFERENCE.boat;
  const rank = (r: CustomerReview) =>
    Math.min(
      ...r.segments.map((s) => {
        const i = preference.indexOf(s);
        return i === -1 ? preference.length : i;
      }),
    );
  return [...CUSTOMER_REVIEWS].sort((a, b) => rank(a) - rank(b));
}

/** Look up a review by its stable id (for config-driven featured quotes). */
export function reviewById(id: string): CustomerReview | undefined {
  return CUSTOMER_REVIEWS.find((r) => r.id === id);
}

/** "Rivajoy Giannitsis" → "RG" for the initials avatars. */
export function reviewerInitials(author: string): string {
  return author
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
