// Shared types for landing pages and the package builder modal.

export type ThemeColors = {
  primary: string;     // hex — used for primary CTA + accents (yellow for bach, gold for wedding…)
  primaryText: string; // text color used on primary button (navy/white)
  navy: string;        // dark surface (modal header bg, dark sections)
  cream: string;       // body bg
  blue: string;        // info / link / per-person price
  primaryHover: string;
};

export type PackageLineItem = {
  name: string;
  qty: number;
  unitPrice: number;
  /** When true, this item is included free (counted toward "save" badge but not added to package price). */
  freebie?: boolean;
  /** Underlying Postgres product handle — needed for Quick-Buy checkout. */
  handle?: string;
  /** Approx number of drinks this unit yields (used for slider scaling). */
  drinksPerUnit?: number;
};

export type Package = {
  name: string;
  /** Legacy/marketing display strings — kept optional for back-compat. */
  price?: string;
  save?: string;
  serves: string;
  blurb: string;
  /** Legacy flat string list for old hardcoded packages. */
  items?: string[];
  /** New itemized list including alcohol (paid) and freebies (free). */
  lineItems?: PackageLineItem[];
  /** Computed retail of paid alcohol items (= what we charge). */
  packagePrice?: number;
  /** Computed retail value of bundled freebies (= what we display as "savings"). */
  freebiesValue?: number;
  image: string;
  featured?: boolean;
  /** Headcount the recipe is balanced for (slider scales items off this). */
  defaultPeople?: number;
  /** Drinks per person target for this occasion (bachelor=20, wedding=8, etc.). */
  drinksPerPerson?: number;
};

export type TrustStat = {
  stat: string;
  label: string;
};

export type Step = {
  n: string;
  title: string;
  body: string;
  /** Optional compact body used on the mobile-friendly 3-column layout. */
  shortBody?: string;
  /** Short tagline shown in the collapsed accordion header (italic, under the title). */
  teaser?: string;
  /** Optional supporting image shown alongside the expanded body. */
  image?: string;
};

export type Venue = {
  area: string;
  detail: string;
};

export type Review = {
  quote: string;
  author: string;
  detail: string;
};

export type Faq = { q: string; a: string };

export type ModalStep = {
  key: string;
  label: string;
};

export type ExtraQuestion = {
  id: string;
  label: string;
  type: 'multi-checkbox';
  options: { value: string; label: string }[];
};

export type ModalConfig = {
  title: string;            // "Build Your Bach Package"
  ctaPrimary: string;       // "BUILD YOUR BACH PACKAGE →"
  ctaPrimaryShort: string;  // "BUILD MY PACKAGE"
  steps: ModalStep[];       // 5-step flow
  beerStepBlurb: string;
  liquorStepBlurb: string;
  mixersStepBlurb: string;
  basicsHeadline: string;
  basicsBlurb: string;
  groupSizeLabel: string;     // "Group size" / "Headcount" / "Guest count"
  groupSizeUnit: string;      // "people" / "guests" / "attendees"
  defaultPeople: number;
  reviewHeadline: string;
  successQuoteHeadline: string;
  successCheckoutHeadline: string;
  emailNotice: string;
  /** Wedding-only: extra checkboxes for which events to stock */
  extraQuestion?: ExtraQuestion;
};

export type LandingConfig = {
  // Routing & metadata
  slug: string;            // "austin-bachelor-party-delivery"
  metaTitle: string;
  metaDescription: string;
  ogImage: string;

  // Branding/theme
  theme: ThemeColors;
  eventLabel: string;      // "BACHELOR PARTY" / "BACHELORETTE WEEKEND"
  audienceTitleCase: string; // "Bachelor Party" / "Wedding Weekend"

  // Hero
  heroEyebrow: string;
  heroHeadline: string;
  heroHeadlineAccent: string; // 2nd line shown in primary color
  heroSubhead: React.ReactNode | string;
  /**
   * Optional abridged bullets shown in the hero in place of (or alongside)
   * the longer subhead. 3–4 short punchy phrases work best.
   */
  heroBullets?: string[];
  heroImage: string;
  /**
   * Optional set of hero backdrop photos (1–4). One image renders static;
   * several crossfade slowly (8s). Falls back to `heroImage` when unset —
   * see HeroBackdrop. Keep it occasion-specific: this is the first visual
   * a paid click sees.
   */
  heroImages?: { src: string; alt: string }[];
  heroTrustBadges: string[];

  // Trust stats (4 cards strip)
  trustStats: TrustStat[];

  // Pain → solution
  painHeadline: string;     // can include line break via \n
  painBody: string;

  // Packages
  packagesEyebrow: string;
  packagesHeadline: string;
  packagesBlurb: string;
  packages: Package[];
  customLine: string;       // "Need something custom? Call us…"

  // How it works
  stepsHeadline: string;
  steps: Step[];

  // Where we deliver
  venuesEyebrow: string;
  venuesHeadline: string;
  venues: Venue[];
  venuesImage: string;

  // Reviews
  reviewsEyebrow: string;
  reviewsHeadline: string;
  reviews: Review[];

  // FAQ
  faqHeadline: string;
  faqs: Faq[];

  // Final CTA
  finalCtaHeadline: string;
  finalCtaHeadlineAccent: string;
  finalCtaSubhead: string;
  finalCtaImage: string;

  // CTAs / phone / email
  phoneDisplay: string;
  phoneTel: string;
  primaryCtaHref: string;   // where the buttons link to (e.g. '#builder' or '/order')
  ctaText: string;          // "BUILD YOUR BACH PACKAGE →"

  // Modal
  modal: ModalConfig;

  // Quote inbox
  quoteInbox: string;

  /**
   * Optional URL for the "Schedule a 10-min call" secondary CTA shown next
   * to the primary "Build your package" button. Points at the planning-call
   * scheduler.
   */
  planningCallUrl?: string;
  /** Text on the secondary CTA. Defaults to "SCHEDULE A 10-MIN CALL →". */
  secondaryCtaText?: string;
};

// ---- Catalog (Package Builder Modal) ----

export type BuilderProduct = {
  id: string;
  name: string;
  detail?: string;
  price: number;
  emoji: string;
  accent: string;
  image?: string;
  /** Underlying Postgres product handle, used for checkout linking. */
  sku?: string;
};

export type BuilderCategory = {
  key: string;
  label: string;
  /** Curated top sellers shown by default. */
  products: BuilderProduct[];
  /** Remaining in-stock items, revealed via "View more". */
  extras?: BuilderProduct[];
};

export type Selection = Record<string, number>;

export type Catalog = {
  stepOneCategories: BuilderCategory[];
  stepTwoCategories: BuilderCategory[];
  stepThreeCategories: BuilderCategory[];
  productById: Record<string, BuilderProduct>;
};
