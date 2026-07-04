import type { ProductFAQItem } from '@/components/products/ProductFAQ';

/**
 * Long-form, SEO-optimized editorial content for Tier-1 product pages
 * (2026-07 editorial sprint — see
 * docs/seo/recommendations/product-page-editorial-sprint-2026-06.md).
 *
 * Each entry follows the Electric-Jellyfish gold-standard template:
 *   lede (head term in first 100 words) -> spec block -> use-case section
 *   with internal links -> how-delivery-works -> FAQ (rendered separately
 *   by <ProductFAQ>) -> internal links out.
 *
 * `descriptionHtml` overrides the short DB description on the product page
 * (rendered via dangerouslySetInnerHTML inside a `.prose` block, so inline
 * <a> internal links work). Keeping the copy here — rather than mutating
 * the Postgres/Shopify description — means it ships and reviews as code.
 * `faqs` drive both the visible FAQ section and its FAQPage JSON-LD.
 */
export interface ProductEditorial {
  /** Rich HTML that replaces the DB description on the product page. */
  descriptionHtml: string;
  /** Heading for the FAQ section. */
  faqHeading: string;
  faqs: ProductFAQItem[];
}

const APEROL_SPRITZ: ProductEditorial = {
  descriptionHtml: `
    <p>The <strong>Aperol Spritz Party Pitcher Kit</strong> is everything you need to pour 16 bright, bittersweet Aperol Spritzes — delivered cold to your Austin event, no bar-tending experience required. It's the golden-hour cocktail that made Italian aperitivo famous: light, citrusy, low-proof, and endlessly refillable. One kit turns a backyard, rooftop, pool deck, or boat into a proper spritz bar in about five minutes, with enough for a group of 16 to each raise a glass (roughly four drinks a person if it's your one signature cocktail).</p>

    <h3>What's in the kit</h3>
    <ul>
      <li><strong>Serves 16</strong> — batched to the classic Aperol Spritz build so every pour tastes the same.</li>
      <li><strong>The 3-2-1 spritz</strong> — prosecco, Aperol, and a splash of soda over ice, finished with an orange slice.</li>
      <li><strong>Roughly 11% ABV per drink</strong> — low enough to sip all afternoon in the Texas heat.</li>
      <li><strong>Bright, bittersweet, citrus-forward</strong> — orange and rhubarb notes, not too sweet.</li>
      <li><strong>No bar tools needed</strong> — build it in a pitcher or straight in the glass; ice and orange are the only adds.</li>
      <li><strong>Arrives chilled</strong> — cold on delivery so you can pour the moment it lands.</li>
    </ul>

    <h3>Best for Austin events</h3>
    <p>The spritz is a crowd-pleaser precisely because it photographs beautifully and goes down easy. It's the drink brides reach for at a <a href="/austin-bachelorette-party-delivery">bachelorette weekend</a> brunch or bridal shower, the low-lift <a href="/weddings">wedding cocktail-hour</a> pour that keeps a line moving, and the perfect thing to have batched and ready for a <a href="/boat-parties">Lake Travis boat day</a> when nobody wants to play bartender on the water. It's also a natural for a rooftop <a href="/blog/ultimate-guide-austin-birthday-parties">Austin birthday party</a> or a client-facing <a href="/austin-corporate-event-delivery">corporate event</a> where you want something that looks elevated but pours fast. Because it's low-ABV, guests can enjoy a few over a long afternoon without the day getting away from them.</p>

    <h3>How delivery works</h3>
    <p>Party On Delivery is a TABC-licensed Austin alcohol delivery service. We bring the Aperol Spritz kit cold to your door, dock, hotel, Airbnb, or venue across the greater Austin area — same-day is often available, and booking 48 hours out locks guaranteed pricing for events. Order minimums run $100–$150 depending on your delivery zone (Lake Travis and far-out addresses start higher to cover the drive). Every order is carded at the door: valid ID, 21+, no exceptions. Planning a bigger crowd? One kit covers about 16 guests as a signature drink — scale to a kit per 15–16 people, or add beer and wine so there's something for everyone.</p>

    <h3>More from Party On Delivery</h3>
    <p>Explore our other <a href="/cocktail-kits">party cocktail kits</a>, browse the <a href="/products">full delivery catalog</a>, or read our guide to <a href="/blog/signature-wedding-cocktails-texas-heat">signature wedding cocktails for the Texas heat</a> for ideas on rounding out the bar. Hosting a wedding weekend? See our full <a href="/weddings">Austin wedding bar service</a>.</p>
  `,
  faqHeading: 'Aperol Spritz Party Kit — Frequently Asked Questions',
  faqs: [
    {
      question: 'How many drinks does the Aperol Spritz Party Pitcher Kit make?',
      answer:
        'The kit is batched to serve 16 Aperol Spritzes — enough for a group of about 16 to each have a signature drink, or a smaller group to enjoy a few rounds. For a party where the spritz is the main cocktail, plan on one kit per 15–16 guests.',
    },
    {
      question: 'Can I get an Aperol Spritz kit delivered same-day in Austin?',
      answer:
        'Yes. Same-day Aperol Spritz delivery is often available across the Austin area, and we recommend booking 48 hours out for events to lock guaranteed pricing. We deliver cold to homes, rooftops, Airbnbs, hotels, wedding venues, and Lake Travis boat docks.',
    },
    {
      question: 'How do you make the Aperol Spritz from the kit?',
      answer:
        "It's the classic 3-2-1 build: three parts prosecco, two parts Aperol, one splash of soda water over plenty of ice, finished with an orange slice. The kit is portioned to that ratio, so you just pour, add ice and orange, and serve — no bar tools or measuring required.",
    },
    {
      question: 'Is the Aperol Spritz a good drink for a hot Austin day?',
      answer:
        "Perfect for it. At roughly 11% ABV per drink, the spritz is light and refreshing — bright, citrusy, and not too sweet — so guests can sip a few over a long, sunny afternoon. It's a go-to for pool parties, boat days, and outdoor weddings in the Texas heat.",
    },
    {
      question: 'Is the kit good for a bachelorette party or bridal shower?',
      answer:
        "Absolutely — it's one of our most popular picks for both. The spritz looks gorgeous in photos and pours fast, so it keeps a brunch or shower moving without anyone stuck behind a bar. Add a few bottles of prosecco for mimosas and you've got the whole daytime celebration covered.",
    },
  ],
};

const KARBACH_LOVE_STREET: ProductEditorial = {
  descriptionHtml: `
    <p><strong>Karbach Love Street</strong> is the easy-drinking Texas blonde that belongs in every Austin cooler — and this 18-pack of 12oz cans is built for the long, sunny days when one round is never enough. Brewed by Houston's Karbach Brewing, Love Street is a Kölsch-style blonde: crisp, clean, gently hoppy, and remarkably sessionable at around 4.9% ABV. It's the beer you reach for on a Lake Travis boat, at a backyard cookout, or from the reception bar when you want something everybody at the party will actually drink. We deliver it cold, by the 18-pack, anywhere in the Austin area.</p>

    <h3>The specs</h3>
    <ul>
      <li><strong>18-pack of 12oz cans</strong> — enough to keep a small group stocked all day.</li>
      <li><strong>Style:</strong> Kölsch-inspired Texas blonde ale — light gold, bright, and clean.</li>
      <li><strong>Around 4.9% ABV</strong> — sessionable, so it holds up through an afternoon on the water.</li>
      <li><strong>Flavor:</strong> soft malt sweetness, a whisper of noble-hop spice, crisp dry finish.</li>
      <li><strong>Cans, not bottles</strong> — pool-, boat-, and dock-safe, and they chill fast.</li>
      <li><strong>Brewed in Texas</strong> by Karbach Brewing, a Houston craft staple.</li>
    </ul>

    <h3>Best for Austin events</h3>
    <p>Love Street's whole appeal is that it's a universal crowd-pleaser — light enough for the wine drinker, characterful enough for the craft fan. That makes it the default case beer for a <a href="/boat-parties">Lake Travis boat day</a>, where cans and sessionable ABV are exactly what you want for eight hours in the sun (our <a href="/blog/essential-checklist-for-your-lake-travis-party-boat-day">Lake Travis party-boat checklist</a> has more on stocking the cooler). It's a natural for a <a href="/austin-bachelor-party-delivery">bachelor party</a> Airbnb fridge or a Rainey Street pregame, and it works beautifully on a <a href="/weddings">wedding reception bar</a> as the approachable local option next to a signature cocktail. Tailgates, cookouts, and birthday backyards? Same answer — grab the 18-pack.</p>

    <h3>How delivery works</h3>
    <p>Party On Delivery is a TABC-licensed Austin alcohol delivery service, and we bring Love Street cold to your door, dock, hotel, or venue across the greater Austin area. Same-day delivery is often available; booking 48 hours ahead locks guaranteed pricing for events. Order minimums run $100–$150 depending on your zone (Lake Travis and far-out addresses start higher). We card every delivery — 21+ with valid ID. Not sure how much beer to get? A rough rule for an all-day event is one to two drinks per person per hour; an 18-pack covers a small crew for an afternoon, so scale up from there and add ice.</p>

    <h3>More from Party On Delivery</h3>
    <p>Browse more <a href="/products?filter=beer">Austin beer delivery</a> options, see the <a href="/products">full catalog</a>, or plan a bigger celebration with our <a href="/boat-parties">boat party</a> and <a href="/austin-bachelor-party-delivery">bachelor party</a> delivery packages.</p>
  `,
  faqHeading: 'Karbach Love Street — Frequently Asked Questions',
  faqs: [
    {
      question: 'Can I get Karbach Love Street delivered in Austin?',
      answer:
        'Yes. We deliver Karbach Love Street by the 18-pack, cold, throughout the greater Austin area — homes, Airbnbs, hotels, wedding venues, and Lake Travis boat docks. Same-day delivery is often available, with 48-hour notice recommended for events.',
    },
    {
      question: 'What style of beer is Love Street?',
      answer:
        "Love Street is a Kölsch-style Texas blonde ale from Karbach Brewing in Houston. It's light gold, crisp, and clean with a soft malt sweetness and a subtle noble-hop character — easy-drinking and approachable for just about everyone.",
    },
    {
      question: 'What is the ABV of Karbach Love Street?',
      answer:
        "Love Street sits at roughly 4.9% ABV, which makes it a sessionable beer — light enough to enjoy several over a long, hot day on the boat or at a cookout without it catching up with you.",
    },
    {
      question: 'Is Love Street a good beer for a boat party or tailgate?',
      answer:
        "It's one of the best picks for both. It comes in cans (pool-, boat-, and dock-safe), chills quickly, and the light, crisp profile is exactly what you want in the Texas sun. The 18-pack keeps a small group going for an afternoon.",
    },
    {
      question: 'How many cans should I order for my party?',
      answer:
        'A good rule of thumb for an all-day event is one to two drinks per guest per hour. An 18-pack covers a small crew for an afternoon; for larger groups or full-day boat trips, order multiple packs and plenty of ice, or let us help build a full package.',
    },
  ],
};

const LA_MARCA_PROSECCO: ProductEditorial = {
  descriptionHtml: `
    <p><strong>La Marca Prosecco</strong> is the crisp, celebratory Italian sparkler that shows up at nearly every Austin toast — and this Extra Dry 6-pack of 750ml bottles is sized for the whole event, from the welcome pour to the send-off. Sourced from the Prosecco DOC in Italy's Veneto region, La Marca is clean, fruit-forward, and famously easy to love: fine bubbles, gentle sweetness, and bright citrus. It's the bottle for wedding toasts, bottomless mimosas, and any moment that deserves a little sparkle — delivered cold to your Austin venue, home, or boat.</p>

    <h3>The specs</h3>
    <ul>
      <li><strong>6 bottles, 750ml each</strong> — roughly 30 flutes, or the base for dozens of mimosas.</li>
      <li><strong>Style:</strong> Prosecco DOC, Extra Dry — a touch of sweetness balanced by fresh acidity.</li>
      <li><strong>Around 11% ABV.</strong></li>
      <li><strong>Tasting notes:</strong> green apple, ripe peach, honey, and citrus with a light floral lift.</li>
      <li><strong>Fine, persistent bubbles</strong> — clean and crisp, never heavy.</li>
      <li><strong>Serve well-chilled</strong> — arrives cold and toast-ready.</li>
    </ul>

    <h3>Best for Austin events</h3>
    <p>Prosecco is the workhorse of celebrations, and La Marca is the crowd-favorite bottle. It's the natural choice for a <a href="/weddings">wedding toast</a> — approachable enough for every guest, elegant enough for the moment — and the essential base for a <a href="/austin-bachelorette-party-delivery">bachelorette</a> mimosa bar or bridal-shower brunch. Pour it at a milestone <a href="/blog/ultimate-guide-austin-birthday-parties">Austin birthday party</a>, ring in New Year's, or bring the bubbles to a <a href="/boat-parties">Lake Travis</a> sunset cruise. Its Extra Dry style — slightly off-dry — pairs beautifully with brunch spreads, fruit, and light apps, and it plays perfectly with orange juice, Aperol, or St-Germain when you want to build something fancier.</p>

    <h3>How delivery works</h3>
    <p>Party On Delivery is a TABC-licensed Austin alcohol delivery service. We bring La Marca cold to your door, hotel, Airbnb, wedding venue, or Lake Travis dock across the greater Austin area — same-day is often available, and 48-hour notice locks guaranteed pricing for events. Order minimums run $100–$150 depending on your delivery zone (Lake Travis and far-out addresses start higher). We card every delivery — 21+, valid ID required. Planning quantities? A 750ml bottle pours about 5 flutes for a toast, or 3–4 generous mimosas; this 6-pack covers a toast for roughly 30 guests, so scale from there.</p>

    <h3>More from Party On Delivery</h3>
    <p>Explore more <a href="/products?filter=wine">Austin wine &amp; sparkling delivery</a>, browse the <a href="/products">full catalog</a>, or plan the whole bar with our <a href="/weddings">wedding</a> and <a href="/austin-bachelorette-party-delivery">bachelorette</a> delivery packages.</p>
  `,
  faqHeading: 'La Marca Prosecco — Frequently Asked Questions',
  faqs: [
    {
      question: 'Can I get La Marca Prosecco delivered in Austin?',
      answer:
        'Yes. We deliver La Marca Prosecco by the 6-pack, chilled, throughout the greater Austin area — including wedding venues, hotels, Airbnbs, and Lake Travis docks. Same-day delivery is often available, and we recommend 48 hours notice for events.',
    },
    {
      question: 'How many mimosas or toasts does the 6-pack make?',
      answer:
        'Each 750ml bottle pours about 5 champagne flutes for a toast, or 3–4 generous mimosas when mixed with orange juice. The 6-pack covers a toast for roughly 30 guests, or a bottomless mimosa bar for a smaller brunch crowd.',
    },
    {
      question: 'Is La Marca Extra Dry sweet?',
      answer:
        'La Marca Extra Dry is lightly off-dry — a touch of sweetness balanced by fresh acidity. It shows green apple, peach, honey, and citrus. That gentle sweetness is exactly why it works so well for mimosas and crowd-pleasing toasts.',
    },
    {
      question: 'Is prosecco a good choice for a wedding toast?',
      answer:
        "It's the most popular choice for a reason. La Marca is approachable for every guest, elegant in the glass, and more budget-friendly than Champagne while still tasting celebratory — ideal for toasting a large group without overspending.",
    },
    {
      question: 'What is the ABV of La Marca Prosecco?',
      answer:
        'La Marca Prosecco is around 11% ABV — a light, crisp sparkling wine that keeps toasts and mimosas festive without being heavy.',
    },
  ],
};

const PINTHOUSE_ELECTRIC_JELLYFISH: ProductEditorial = {
  descriptionHtml: `
    <p><strong>Pinthouse Electric Jellyfish</strong> is Austin's cult-favorite hazy IPA, and these 16oz 4-pack cans deliver the local legend cold to your door. Brewed right here in Austin by Pinthouse Brewing, Electric Jellyfish is a juicy, tropical, well-balanced IPA that's become a genuine icon of the city's craft-beer scene. Big notes of pineapple, mango, and citrus ride over a smooth malt backbone and a hop bitterness that's present but never harsh — hop-forward yet remarkably approachable. If you want a beer that says "we're in Austin," this is it, and we bring it to boats, backyards, and reception bars across the metro.</p>

    <h3>The specs</h3>
    <ul>
      <li><strong>4-pack of 16oz "pounder" cans</strong> — the ideal share size for a cooler.</li>
      <li><strong>Style:</strong> hazy / juicy American IPA.</li>
      <li><strong>Around 6.6% ABV.</strong></li>
      <li><strong>Flavor:</strong> pineapple and mango tropical fruit, grapefruit and orange citrus, smooth finish.</li>
      <li><strong>Balanced bitterness</strong> — hop-forward but easy-drinking, great for IPA fans and newcomers alike.</li>
      <li><strong>Brewed in Austin</strong> by Pinthouse Brewing — support a beloved local brewery.</li>
    </ul>

    <h3>Best for Austin events</h3>
    <p>Electric Jellyfish is the beer to bring when you want a local flex. It's a boat-day staple on <a href="/boat-parties">Lake Travis</a> (the 16oz cans are perfect for the cooler), the craft pick for a <a href="/austin-bachelor-party-delivery">bachelor party</a> Airbnb or brewery-crawl afternoon, and the beer plenty of couples specifically request for a <a href="/weddings">wedding reception bar</a> to showcase Austin's brewing scene. It's just as at home at a gameday watch party, a backyard cookout, or an <a href="/blog/ultimate-guide-austin-birthday-parties">Austin birthday</a>. The balanced, tropical profile pairs beautifully with barbecue, tacos, burgers, and spicy food — which is to say, with pretty much everything Austin eats.</p>

    <h3>How delivery works</h3>
    <p>Party On Delivery is a TABC-licensed Austin alcohol delivery service, and we deliver Electric Jellyfish cold throughout the greater Austin area — homes, offices, hotels, Airbnbs, wedding venues, and Lake Travis boat docks. Same-day delivery is often available; booking 48 hours out locks guaranteed pricing for events. Order minimums run $100–$150 depending on your zone (Lake Travis and far-out addresses start higher to cover the drive). Every delivery is carded — 21+ with valid ID. For an all-day event, plan on one to two drinks per guest per hour and keep plenty of ice on hand; we're happy to help build a full package around it.</p>

    <h3>More from Party On Delivery</h3>
    <p>Discover more <a href="/products?filter=beer">Austin craft beer delivery</a>, browse the <a href="/products">full catalog</a>, or plan the whole event with our <a href="/boat-parties">boat party</a> and <a href="/weddings">wedding</a> delivery packages.</p>
  `,
  faqHeading: 'Pinthouse Electric Jellyfish — Frequently Asked Questions',
  faqs: [
    {
      question: 'Can I get Pinthouse Electric Jellyfish IPA delivered in Austin?',
      answer:
        "Yes. We deliver Pinthouse Electric Jellyfish cold throughout the Austin area — Downtown, South and East Austin, Westlake, Cedar Park, Lake Travis, and beyond. Same-day delivery is often available, with 48-hour notice recommended for events. It's award-winning local craft beer brought straight to your door.",
    },
    {
      question: 'What does Electric Jellyfish taste like?',
      answer:
        'Electric Jellyfish is a hazy, juicy American IPA with big tropical fruit notes (pineapple, mango), citrus (grapefruit, orange), and a smooth malt backbone. The bitterness is present but balanced — hop-forward yet approachable enough for craft-beer newcomers.',
    },
    {
      question: 'What is the ABV of Electric Jellyfish?',
      answer:
        'Electric Jellyfish is around 6.6% ABV. It comes in 16oz cans, so a 4-pack is a solid share size for a cooler or a small gathering.',
    },
    {
      question: 'Is Electric Jellyfish good for parties, weddings, and boat days?',
      answer:
        'Very. The 16oz cans are perfect for a Lake Travis boat cooler, and many couples request Electric Jellyfish for a wedding reception bar to showcase local Austin brewing. It also shines at bachelor parties, gamedays, and backyard cookouts.',
    },
    {
      question: 'Where is Pinthouse Electric Jellyfish brewed?',
      answer:
        "Electric Jellyfish is brewed in Austin by Pinthouse Brewing, one of the city's premier craft breweries. Ordering it through Party On Delivery is an easy way to support a beloved local business while stocking your event.",
    },
  ],
};

/** handle -> editorial content. */
export const PRODUCT_EDITORIAL: Record<string, ProductEditorial> = {
  'aperol-spritz-party-pitcher-kit-16-drinks': APEROL_SPRITZ,
  'karbach-love-street-blonde-18-pack-12oz-can': KARBACH_LOVE_STREET,
  'la-marca-prosecco-extra-dry-750ml-6-pack': LA_MARCA_PROSECCO,
  'pinthouse-electric-jellyfish-16oz-4-pack-can': PINTHOUSE_ELECTRIC_JELLYFISH,
};

/** Returns the editorial content for a product handle, if we have a rewrite. */
export function getProductEditorial(handle: string): ProductEditorial | undefined {
  return PRODUCT_EDITORIAL[handle];
}
