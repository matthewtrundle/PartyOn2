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
