
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import Navigation from "@/components/Navigation"
import ShareButtons from '@/components/blog/ShareButtons'
import { notFound } from 'next/navigation'
import { getMDXPost, getAllMDXPosts } from '@/lib/blog-mdx'
import MDXContentRSC from '@/components/blog/MDXContentRSC'
import BlogTopicCTA from '@/components/blog/BlogTopicCTA'
import blogPostsData from '@/data/blog-posts/posts.json'
import { seoConfig } from '@/lib/seo/config'
import { generateArticleSchema } from '@/lib/seo/schemas'

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  publishedAt?: string
  date?: string
  author: string
  tags: string[]
  image?: {
    url: string
    alt: string
  }
  seo?: {
    title: string
    description: string
    keywords: string[]
  }
  schema?: {
    questionsAnswered: string[]
    topics: string[]
  }
  category?: string
  readTime?: string
  authorImage?: string
}

// Use actual blog posts from JSON instead of hardcoded data
const blogPosts = blogPostsData as BlogPost[]

// Tell Next.js to allow dynamic params not in generateStaticParams
// This is REQUIRED in Next.js 15 when using generateStaticParams
export const dynamicParams = true

// Keep legacy hardcoded posts for backward compatibility (DEPRECATED - use posts.json)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _legacyBlogPosts = [
  {
    slug: 'ultimate-guide-austin-boat-parties',
    title: 'The Ultimate Guide to Austin Boat Parties',
    excerpt: 'Everything you need to know about hosting the perfect boat party on Lake Travis, from planning to execution.',
    image: '/images/hero/lake-travis-yacht-sunset.webp',
    category: 'Event Planning',
    date: '2024-03-15',
    readTime: '8 min read',
    author: 'Sarah Mitchell',
    authorImage: '/images/authors/allan-henslee.png',
    content: `
      <p class="lead">The pontoon was sinking. Not dramatically – this wasn't Titanic – but definitely listing to starboard where all twelve bachelorettes had congregated for a group selfie. As I watched our carefully arranged champagne pyramid slide toward disaster, I had two thoughts: we needed more ballast, and this was exactly why boat parties are the best worst idea ever.</p>

      <p>That was three years ago at Devil's Cove, and that tilting pontoon taught me more about Lake Travis boat parties than any captain's certification ever could. Spoiler alert: we saved the champagne, redistributed the bachelorettes, and that photo now has 2,000 likes on Instagram.</p>

      <h2>The Lake Travis Paradox</h2>
      <p>Here's what nobody tells you about Lake Travis: it's simultaneously the easiest and hardest place to throw a party. The water's perfect, the views are unmatched, and the vibe is always right. But between fluctuating water levels, weekend boat traffic that makes I-35 look peaceful, and weather that changes its mind more than a bride picking centerpieces, you need to know what you're doing.</p>

      <p>I've delivered drinks to everything from two-person kayaks to 100-foot yachts. The best parties? They're rarely on the biggest boats.</p>

      <blockquote>"The secret to Lake Travis isn't the boat – it's knowing where to put it." - Captain Barbara, who's been navigating these waters since before it was cool</blockquote>

      <h2>The Boat Truth Nobody Wants to Hear</h2>
      <p>You're browsing rental sites, seeing party barges that promise to fit 20 people. Here's the reality check: that's 20 people standing still. Add dancing, coolers, that inflatable flamingo Jessica insists on bringing, and suddenly your spacious barge feels like a crowded elevator.</p>

      <p>The golden rule? Take your group size, add 30% more space, then add another 20% for the stuff nobody mentioned they were bringing. That "small gathering of 15" becomes 18 people, 4 coolers, 2 floating mats, someone's drone, and a sound system that belongs in a nightclub.</p>

      <div class="insider-tip">
        <h3>The Real Boat Math</h3>
        <p class="tip-intro">What rental companies list vs. party reality:</p>
        <ul>
          <li>"Seats 12" = Comfortable for 8 partiers</li>
          <li>"Fits 20" = 15 if you want anyone to move</li>
          <li>"Party Barge for 30" = 20-25 for actual partying</li>
          <li>Always spring for the boat with a bathroom. Always.</li>
        </ul>
      </div>

      <h2>Timing Is Everything (And I Mean Everything)</h2>
      <p>Saturday at 2 PM in July? You might as well try to find parking downtown during SXSW. But Thursday at 11 AM in the same month? You'll have Devil's Cove practically to yourself.</p>

      <p>The sweet spot nobody talks about: Tuesday through Thursday, 10 AM departure. You get the full lake experience without the weekend warriors, prices drop by 40%, and the coves aren't packed like sardine cans. Plus, your Instagram photos won't have 47 other boats in the background.</p>

      <h2>The Hydration Situation</h2>
      <p>Let me paint you a picture: It's 97°F, you're three White Claws deep, the sun is bouncing off the water like a laser show, and someone just suggested doing another round of shots. This is where good parties become cautionary tales.</p>

      <p>The single biggest party killer on Lake Travis? Dehydration. I've seen 25-year-old athletes taken down by noon because they forgot that being on water doesn't mean you're drinking water. The rule that's saved countless parties: For every alcoholic drink, match it with water. Not later. Not eventually. Right then.</p>

      <div class="insider-tip">
        <h3>The Lake Travis Survival Kit</h3>
        <p class="tip-intro">What actually matters on the water:</p>
        <ul>
          <li>Electrolyte packets (hidden in the first aid kit)</li>
          <li>Frozen water bottles (they're ice AND hydration)</li>
          <li>That one friend who's the "mom" of the group</li>
          <li>SPF 50 (SPF 30 is a lie the sun tells you)</li>
          <li>Zinc for noses (unless raccoon eyes are your thing)</li>
        </ul>
      </div>

      <h2>The Secret Spots Nobody's Posting About</h2>
      <p>Devil's Cove is great if you want to feel like you're at a floating nightclub. But after years of delivering to every corner of this lake, I've learned where the locals actually go.</p>

      <p><strong>Cypress Creek Arm:</strong> Wednesday afternoons, this place is paradise. Protected from wind, zero wake zone nearby, and that cliff everyone's too scared to jump off (until beer #4).</p>

      <p><strong>The Pocket at Mansfield Dam:</strong> Only accessible by boat, consistently 10 degrees cooler, and the water's so clear you can see your questionable decision to wear white swimming.</p>

      <p><strong>West of Starnes Island:</strong> The sweet spot between "party cove energy" and "we can actually hear each other talk." Plus, the sunset hits different here.</p>

      <blockquote>"The best spot on Lake Travis is wherever the Coast Guard isn't." - Every boat captain, after their third summer</blockquote>

      <h2>The Music Situation (It's Complicated)</h2>
      <p>Your boat has Bluetooth. Great. So does every other boat within 100 yards. The result? A sonic battlefield where country music fights EDM while classic rock tries to mediate.</p>

      <p>The power move: Invest in a good marine speaker system and claim your sonic territory early. But here's the unwritten rule – after 6 PM, whoever has the best sunset playlist wins. I've seen boat parties unite over a perfectly timed "Mr. Brightside" as the sun hits the horizon.</p>

      <h2>The Float Game Changes Everything</h2>
      <p>That inflatable unicorn from Amazon? Amateur hour. The game-changers are the floating mats that connect boats like aquatic bridges. Suddenly, your 20-person party can mingle with the 15-person party next door, and before you know it, you're hosting Lake Travis's version of the UN.</p>

      <p>But the real MVP? The floating cooler. Not the dinky one that holds 12 beers. I'm talking about the one that could double as a life raft. Position it strategically, and you've created the lake's most popular swim-up bar.</p>

      <h2>Weather: Your Frenemy with Benefits</h2>
      <p>Texas weather is like that friend who's super fun but completely unreliable. I've delivered to parties that started in blazing sun and ended in biblical hail. The afternoon thunderstorm that "wasn't supposed to hit until 6" showing up at 2? Classic Lake Travis.</p>

      <p>The locals' secret: Check the radar, sure, but also watch the birds. When the grackles start heading inland, you've got 20 minutes to find shelter. When the wind shifts from south to north, party's over. Nature's been doing weather alerts longer than your phone has.</p>

      <h2>The Cleanup Nobody Talks About</h2>
      <p>Here's what Instagram doesn't show: the aftermath. Empty cans floating like shameful jellyfish. That biodegradable glitter that's definitely not biodegradable. The realization that "someone else" was supposed to be counting heads before leaving the cove.</p>

      <p>The groups that get invited back? They bring trash bags, do headcounts like Navy SEALs, and leave their spot better than they found it. It's not sexy, but neither is getting banned from every marina on the lake.</p>

      <h2>The Real Secret to Lake Travis Success</h2>
      <p>After years of watching parties succeed and fail spectacularly, here's the truth: The best boat parties aren't about the boat. They're about the moment when everyone's phone dies, the speaker's playing something nobody asked for but everybody loves, and someone's attempting to explain their startup idea while floating on a pizza slice.</p>

      <p>It's about that golden hour when the water's like glass, the drinks are perfectly cold, and somebody says "we should do this every weekend" and actually means it.</p>

      <h2>Your Lake Travis Checklist</h2>
      <p>Forget the basic lists. Here's what actually matters:</p>

      <p><strong>The Week Before:</strong> Check water levels. Seriously. Lake Travis can drop 10 feet in a month. That cove you loved last year might be a peninsula now.</p>

      <p><strong>The Night Before:</strong> Freeze everything. Water bottles, towels (trust me), even grapes. Future you will thank past you.</p>

      <p><strong>The Morning Of:</strong> Start hydrating at breakfast. Load the boat in reverse order (first on, last off). Designate a "boat mom" who counts heads and holds the sunscreen.</p>

      <p><strong>The Moment Of:</strong> When something goes wrong (and it will), remember: Every disaster becomes a legendary story if you add enough time and tequila.</p>

      <p class="cta-text">Ready to elevate your Lake Travis boat party from basic to legendary? Let's talk about bar packages that travel from dock to cove. Because the only thing worse than warm beer on a boat is no beer on a boat.</p>
    `
  },
  {
    slug: 'signature-wedding-cocktails-texas-heat',
    title: 'Signature Wedding Cocktails for Texas Heat',
    excerpt: 'Beat the Texas sun with these refreshing cocktail recipes perfect for outdoor weddings.',
    image: '/images/services/weddings/signature-cocktails-closeup.webp',
    category: 'Cocktail Recipes',
    date: '2024-03-10',
    readTime: '5 min read',
    author: 'Marcus Chen',
    authorImage: '/images/authors/brian-hill.png',
    content: `
      <p class="lead">The thermometer at Star Hill Ranch read 104°F when Sarah Martinez started crying. It was 4:47 PM on a picture-perfect Saturday in July – if you ignored the fact that her carefully planned outdoor wedding cocktail hour was melting faster than the ice sculptures.</p>

      <p>"The margaritas are separating, the wine is basically mulled at this point, and my aunt just asked if we're serving hot toddies on purpose," she told me, mascara somehow still perfect despite the tears. That's when I knew we had about thirteen minutes to save this reception.</p>

      <h2>The Texas Heat Reality Check</h2>
      <p>Here's what no one tells you about outdoor weddings in Texas: it's not just about keeping drinks cold. It's about understanding that our heat is different – it's aggressive, unforgiving, and it will find every weakness in your beverage plan.</p>

      <p>I've been crafting cocktails for Austin weddings for eight years, and that afternoon at Star Hill taught me more about heat-beating drinks than any bartending course ever could. Sarah's wedding became our laboratory, and her guests became our very willing test subjects.</p>

      <h2>The Honeymoon Highball That Started Everything</h2>
      <p>In the catering tent, my team and I went into crisis mode. Our first creation was born from desperation and a bag of local honey from Goodflow: The Hill Country Honeymoon.</p>

      <p>I remember muddling cucumber like my life depended on it while Marcus shouted ingredients from memory: "Tito's, obviously – keep it local! That honey simple syrup we made this morning. Fresh lime, more cucumber, and for God's sake, don't forget the mint!"</p>

      <p>The magic happened when we added the splash of sparkling water. Suddenly, we had a cocktail that didn't just taste refreshing – it actually lowered your body temperature. Sarah's mom took the first sip, and I swear I saw her shoulders relax for the first time all day.</p>
      
      <div class="recipe-card">
        <h3>Hill Country Honeymoon</h3>
        <p class="recipe-intro">What saved Sarah's wedding – now our most requested summer cocktail</p>
        <ul>
          <li>2 oz Tito's Vodka (because Austin)</li>
          <li>1 oz fresh lime juice</li>
          <li>0.75 oz local honey syrup</li>
          <li>4-5 cucumber slices (English, not regular)</li>
          <li>8-10 fresh mint leaves</li>
          <li>2 oz Topo Chico (accept no substitutes)</li>
        </ul>
        <p><em>Marcus's method: Muddle cucumber and mint gently – you want oils, not a salad. Add vodka, lime juice, and honey syrup. Shake with more ice than you think you need. Double strain into a Collins glass filled with fresh ice. Top with Topo Chico. Garnish with a cucumber ribbon if you're feeling fancy.</em></p>
      </div>

      <h2>When Prickly Pear Saved the Day</h2>
      <p>By 5:15, we had three drinks in rotation. The second – our Prickly Pear Paloma – came about because Marcus remembered his grandmother's advice: "In Texas heat, you need salt, mijo. Always salt."</p>

      <p>The Tajín rim wasn't just for show. Combined with the prickly pear's natural cooling properties and fresh grapefruit, it became our secret weapon against dehydration. Plus, that vibrant pink color? It photographed beautifully against the Hill Country sunset, which made the Instagram-loving bridesmaids ecstatic.</p>

      <blockquote>"I don't even like tequila, but this is dangerous," the mother of the bride said, already on her second one. That's when we knew we'd turned the corner.</blockquote>

      <div class="recipe-card">
        <h3>Prickly Pear Paloma</h3>
        <p class="recipe-intro">The drink that made tequila converts of an entire wedding party</p>
        <ul>
          <li>2 oz blanco tequila (we use Cimarron)</li>
          <li>1 oz Desert Bloom prickly pear syrup</li>
          <li>0.5 oz fresh lime juice</li>
          <li>3 oz fresh grapefruit juice</li>
          <li>Splash of Topo Chico</li>
          <li>Tajín and salt rim (50/50 mix)</li>
          <li>Grapefruit sparkling water</li>
        </ul>
        <p><em>Rim glass with Tajín, combine ingredients in shaker with ice, strain into glass filled with fresh ice, top with grapefruit sparkling water.</em></p>
      </div>

      <h2>The Lavender Lesson</h2>
      <p>Around 6 PM, just as the father-daughter dance was starting, an older gentleman approached the bar. "Young lady," he said, "my wife needs something without tequila, but everything else tastes like fruit juice."</p>

      <p>That's when inspiration struck. The venue had lavender growing wild along the pathways – a detail Sarah had fallen in love with during their first visit. Twenty minutes later, we were serving Lavender Lemonade Spritzes in champagne flutes, and I watched seasoned bourbon drinkers go back for seconds.</p>

      <div class="recipe-card">
        <h3>Lady Bird Lavender Spritz</h3>
        <p class="recipe-intro">Named after the wildflower highways, sophisticated enough for bourbon lovers</p>
        <ul>
          <li>1.5 oz Waterloo No.9 Gin</li>
          <li>1 oz lavender honey syrup</li>
          <li>1 oz Meyer lemon juice</li>
          <li>4 oz Prosecco (chilled to arctic levels)</li>
          <li>2 dashes lavender bitters</li>
          <li>Fresh lavender sprig (or dried if fresh wilts)</li>
        </ul>
        <p><em>Pro tip: Make lavender ice cubes the night before. They keep the drink cold without diluting and look like tiny purple gems.</em></p>
      </div>

      <h2>What We Learned About Beating the Heat</h2>
      <p>That wedding taught us protocols we still use today. It's not just about the recipes – though God knows those matter. It's about understanding the rhythm of a Texas afternoon and respecting what 100+ degrees actually means.</p>

      <h3>The 20-Minute Rule</h3>
      <p>In Texas heat, any drink sitting out for more than 20 minutes is dead. We now pre-batch in smaller quantities and keep backups on ice. Sarah's cousin learned this the hard way when she nursed the same mojito for an hour. "It tastes like grass water," she announced loudly during the best man's speech.</p>

      <h3>Glass Matters More Than You Think</h3>
      <p>Those pretty mason jars everyone loves? They're heat magnets. We switched to insulated vessels halfway through Sarah's reception, and it changed everything. Now we bring our own double-walled glassware to outdoor events. Yes, it's extra work. No, we're not sorry.</p>

      <h3>The Garnish Game Changes</h3>
      <p>Fresh herbs wilt in about 30 seconds in direct sun. We learned to keep garnishes in ice water and add them à la minute. Those dehydrated citrus wheels everyone loves? They were born from necessity that day when our fresh citrus started looking like it had been through a food dehydrator.</p>

      <h2>Beyond the Bar: Creating the Experience</h2>
      <p>The drinks saved the day, but the full experience is what made Sarah's wedding legendary. We discovered that presentation and service style matter just as much as the recipes.</p>

      <p>Multiple satellite bars prevent long lines in the sun. We had three stations by the end of the night – one by the ceremony exit, one near the dance floor, and a roaming cart that found the wallflowers. Pre-chilled glassware stations became our secret weapon (we literally had coolers full of frosted glasses).</p>

      <p>Every third drink, we'd gently suggest water. "Hydration station" became our rallying cry, delivered with a wink and a bottle of Topo Chico. The champagne toast waited until sunset when the temperature finally dropped below 95.</p>

      <h2>The Plot Twist Nobody Expects</h2>
      <p>Here's the kicker – Sarah's wedding became legendary, but not for the reasons you'd think. Six months later, I ran into her aunt at Central Market. "That was the best wedding I've ever been to," she said, squeezing avocados. "Everyone was so happy and relaxed!"</p>

      <p>She didn't remember the near-disaster. She didn't know about the frantic recipe adjustments or the emergency ice runs. She remembered dancing until midnight, laughing with cousins she hadn't seen in years, and that "dangerous pink drink" she'd had three of.</p>

      <p>That's when I realized: we didn't just save a wedding. We created an experience where the heat became a footnote instead of the headline.</p>

      <h2>Your Texas Wedding Survival Guide</h2>
      <p>After eight years and hundreds of weddings, here's what actually works:

      <p><strong>Start Early, End Happy:</strong> Book your bars for 30 minutes before you think you need them. Guests arrive thirsty.</p>

      <p><strong>The Venue Matters:</strong> We've learned which Austin venues have the best shade patterns. Laguna Gloria's oak trees are clutch at 4 PM. The Driskill's rooftop needs our full shade setup. Mercury Hall's courtyard is perfect after 6.</p>

      <p><strong>Trust Your Bartenders:</strong> When we suggest switching from champagne to Prosecco (it holds bubbles better in heat) or adding more ice stations, we're not being difficult. We're protecting your party.</p>

      <p><strong>Batch Wisely:</strong> Pre-batched cocktails are your friend, but only if done right. We make bases in the morning, add fresh citrus on-site, and never batch anything carbonated.</p>

      <h2>The Truth About Texas Wedding Cocktails</h2>
      <p>After that day at Star Hill Ranch, we stopped thinking about wedding cocktails as just drinks. They're your first line of defense against the Texas sun. They're conversation starters. They're Instagram moments. Most importantly, they're what your guests will remember while they're toasting your love.</p>

      <p>Sarah sends us a photo every July 15th – her anniversary. She's always holding a Hill Country Honeymoon, and she's always smiling. The mascara is perfect.</p>

      <p class="cta-text">Ready to create wedding cocktails that can stand up to Texas heat? Let's talk about your vision – and your venue's afternoon sun exposure. Because in Texas, love might be unconditional, but staying cool requires a strategy.</p>
    `
  },
  {
    slug: 'bachelor-party-ideas-austin-2024',
    title: 'Top 10 Bachelor Party Ideas in Austin for 2024',
    excerpt: 'From brewery tours to lake adventures, discover the best ways to celebrate in the Live Music Capital.',
    image: '/images/gallery/sunset-champagne-pontoon.webp',
    category: 'Event Ideas',
    date: '2024-03-05',
    readTime: '10 min read',
    author: 'Jake Thompson',
    authorImage: '/images/authors/brian-hill.png',
    content: `
      <p class="lead">"No strippers, no Vegas, and for the love of God, no matching t-shirts." Those were the groom's only rules when his brother called me at 11 PM on a Tuesday, desperate to plan a bachelor party that didn't suck.</p>

      <p>I've been orchestrating Austin bachelor parties for nearly a decade, and let me tell you – the best ones break every stereotype. Like the time we turned a group of investment bankers into amateur pitmasters, or when we accidentally discovered that former NFL players are terrible at paddleboarding after three beers.</p>

      <p>Here's what actually works in 2024, learned from hundreds of successful (and a few legendary) Austin bachelor parties.</p>

      <h2>The Lake Travis Revelation</h2>
      <p>It was supposed to be a disaster. Twelve guys from Boston, half of whom had never been on a boat, decided they wanted the "full Texas lake experience." By 2 PM, I was watching the best man attempt to wakeboard while holding a beer (spoiler: physics won).</p>

      <p>But here's what made it legendary: We'd positioned a floating bar station at Devil's Cove. As guys fell off paddleboards and lost at beer pong, they could swim up to a fully stocked bar floating in paradise. The groom later said it was the moment he knew his friends actually got him.</p>

      <blockquote>"Forget the yacht clubs. Find a captain who knows the party coves, bring more ice than you think you need, and let Texas do the rest." - Captain Mike, Lake Travis legend</blockquote>

      <div class="insider-tip">
        <h3>The Lake Travis Playbook</h3>
        <p class="tip-intro">What the rental companies won't tell you:</p>
        <ul>
          <li>Book the 11 AM slot, not 2 PM – you'll have Devil's Cove to yourself</li>
          <li>Volente Beach Marina > Lake Travis Marina for bachelor parties</li>
          <li>Bring a floating cooler – it's a game changer</li>
          <li>Wednesday-Thursday rentals are 40% cheaper with same party vibes</li>
        </ul>
      </div>

      <h2>The Brewery Tour That Became a Cook-Off</h2>
      <p>Standard brewery tours are fine. You know what's better? The day we turned a brewery crawl into an impromptu BBQ competition at Still Austin.</p>

      <p>It started innocently. The group was at their third stop, Treaty Oak Distilling, when they discovered the on-site BBQ joint. One thing led to another, and suddenly we had investment bankers arguing about brisket bark with the pitmaster. By the time we hit Still Austin, the distillery manager had heard about our "touring BBQ critics" and challenged them to a blind tasting.</p>

      <p>Six hours later, these Connecticut guys were teaching the staff about smoke rings. The groom's phone still has a video of his best man explaining beef grades to a very patient bartender.</p>

      <div class="insider-tip">
        <h3>The Anti-Brewery Tour Route</h3>
        <p class="tip-intro">Skip the obvious spots and create an experience:</p>
        <ul>
          <li><strong>Start:</strong> Meanwhile Brewing (coffee + beer, trust me)</li>
          <li><strong>Lunch:</strong> Treaty Oak + BBQ pairing challenge</li>
          <li><strong>Afternoon:</strong> Still Austin private tasting room</li>
          <li><strong>Sunset:</strong> The Oasis brewing with that view</li>
          <li><strong>Nightcap:</strong> Whisler's for mezcal education</li>
        </ul>
      </div>

      <h2>Racing, But Make It Ridiculous</h2>
      <p>COTA is impressive. But you know what's more impressive? Watching a group of "car guys" realize they've been out-driven by the 62-year-old father of the bride who "just came along for the ride."</p>

      <p>Pro tip: Book the sunset session. Not only is it cooler (Texas heat is real), but there's something poetic about racing into the sunset while your buddy prepares for marriage. Plus, the photos are incredible – just ask the group who now has their victory lap photo as their fantasy football league's trophy.</p>

      <h2>The 6th Street Redemption</h2>
      <p>Look, I get it. 6th Street has a reputation. But here's the thing – if you do it right, it's still the heartbeat of Austin nightlife. The key is timing and strategy.</p>

      <p>Start at 7 PM (not 10 PM like the amateurs) at Garage Bar on the rooftop. By the time the bachelorette parties flood Dirty 6th, you've already moved to West 6th for actual cocktails at Elephant Room. End the night at Rainey Street where the groom can pretend he's classy while doing pickle shots at Banger's.</p>

      <blockquote>"The best bachelor parties I've seen don't try to hit every bar. They find three great spots and actually enjoy them." - Tommy, bartender at Whisler's for 8 years</blockquote>

      <h2>The Wildcard Winners</h2>
      <p>Some of my favorite bachelor party moments came from the unexpected:</p>

      <p><strong>The Breakfast Taco Tournament:</strong> Eight competitive guys, four taco joints, one morning. Veracruz won, but the real victory was watching grown men seriously debate salsa verde consistency.</p>

      <p><strong>The Hippie Hollow Incident:</strong> Texas's only clothing-optional beach became the site of the most epic beach volleyball game. (Everyone kept their shorts on, but the story gets better every time they tell it.)</p>

      <p><strong>The Franklin BBQ Strategy Session:</strong> They arrived at 6 AM with a full bar setup for the line. By the time Franklin opened, they'd made friends with half of Austin and had three wedding invitations.</p>

      <h2>The Reality Check</h2>
      <p>Here's what nobody tells you about bachelor parties: The best ones aren't about checking boxes or Instagram moments. They're about that moment at 3 PM when everyone's guard is down, the jokes are flowing, and someone says something stupidly sentimental that becomes an inside joke forever.</p>

      <p>I've seen bachelor parties at $20,000 ranches and dive bars in East Austin. The price tag doesn't determine the memories. It's about knowing your group and playing to Austin's strengths – weird, wonderful, and unapologetically itself.</p>

      <p><strong>Book Early, Party Harder:</strong> March and October book up fast. If you're planning around ACL or SXSW, add three weeks to your planning timeline.</p>

      <p><strong>The Two-Night Sweet Spot:</strong> Thursday arrival, Saturday departure. You get the weekend vibe without the Sunday scaries or Monday meeting casualties.</p>

      <p><strong>Weather Reality:</strong> It's Texas. It might be 95°F in October or 45°F in March. Pack layers and always have a Plan B for outdoor activities.</p>

      <p><strong>The Local's Secret:</strong> Tuesday night at The White Horse for two-stepping lessons. Your crew learning to dance country is worth its weight in blackmail material.</p>

      <h2>Transportation Truth Bombs</h2>
      <p>The biggest bachelor party killer? "We'll just Uber everywhere." Sure, until surge pricing hits 4x and you're splitting up because only compact cars are available.</p>

      <p>Get a Sprinter van with a good driver who knows Austin. Not a party bus – those are for bachelorettes and 21st birthdays. You want something you can actually conversation in, blast your music, and make quick decisions without committee votes on the next stop.</p>

      <h2>Where Success Sleeps</h2>
      <p>Forget downtown hotels unless you're made of money. Here's what actually works:</p>

      <p><strong>The East Side Play:</strong> Rent a house in East Austin. You're 10 minutes from everything, have a yard for morning recovery, and your neighbors are used to shenanigans.</p>

      <p><strong>The Domain Option:</strong> If hotels are mandatory, The Domain offers upscale without downtown prices. Plus, Rock Rose has enough bars to never leave if needed.</p>

      <p><strong>The Lake House Move:</strong> All-in on lake life? Rent on Lake Travis. Morning swims cure hangovers better than any prairie oyster.</p>

      <h2>The Unwritten Rules</h2>
      <p>After all these years, here's what separates good bachelor parties from legendary ones:</p>

      <p>1. <strong>One Phone Rule:</strong> Designate one person for photos. Everyone else stays present. The best moments happen when nobody's recording.</p>

      <p>2. <strong>The Breakfast Non-Negotiable:</strong> Mandatory group breakfast every morning. It's where the previous night's stories solidify into legend.</p>

      <p>3. <strong>Secret Weapon:</strong> Bring a bottle of the groom's favorite whiskey. When everything goes sideways (and something always does), breaking it out saves the day.</p>

      <p>4. <strong>The 2/3 Rule:</strong> Plan activities for 2/3 of your group. Someone always sleeps in, feels rough, or meets a local. Don't let their absence derail the adventure.</p>

      <h2>Your Move, Best Man</h2>
      <p>Look, I've seen bachelor parties where they spent $10K and had a mediocre time. I've also seen eight guys with a cooler of beer have the weekend of their lives on a public boat ramp.</p>

      <p>The secret? Stop trying to create the perfect bachelor party and start creating the perfect bachelor party for YOUR group. Austin's just the canvas – you bring the paint.</p>

      <p>And when you need someone to make sure the bar follows you wherever the adventure leads? That's where we come in. Because the only thing worse than running out of beer at Devil's Cove is trying to explain to the groom why his bachelor party ended at 9 PM.</p>

      <p class="cta-text">Ready to give the groom a send-off worthy of Austin? Let's talk about keeping your crew refreshed from lake to late night. Because great bachelor parties don't happen by accident – they happen with great planning and better drinks.</p>
        <li>Professional bartenders</li>
        <li>All equipment and supplies</li>
        <li>Next-day recovery packages</li>
      </ul>

      <p>Ready to plan an epic Austin bachelor party? Contact Party On Delivery today, and let's create a celebration worthy of the groom-to-be.</p>
    `
  },
  {
    slug: 'corporate-event-bar-service-tips',
    title: 'Professional Bar Service for Corporate Events',
    excerpt: 'Impress clients and colleagues with these expert tips for corporate event beverage service.',
    image: '/images/backgrounds/rooftop-terrace-elegant-1.webp',
    category: 'Business',
    date: '2024-02-28',
    readTime: '6 min read',
    author: 'Amanda Rodriguez',
    authorImage: '/images/authors/allan-henslee.png',
    content: `
      <p class="lead">The managing partner was three bourbons deep, explaining cryptocurrency to our bartender, when the CEO of their biggest client walked in. What happened next taught me everything about why corporate bar service is 90% psychology and 10% pouring.</p>

      <p>Instead of panicking, our bartender – let's call him Miguel – smoothly transitioned the crypto conversation to include the CEO, poured him his known favorite (Macallan 18, one rock), and casually mentioned the managing partner's recent industry award. By the end of the night, they'd closed a seven-figure deal. Miguel got a $500 tip.</p>

      <p>That's corporate bar service. It's not about the drinks. It's about reading the room like a diplomat and pouring like a chemist.</p>

      <h2>The Corporate Event Paradox</h2>
      <p>Here's what nobody admits about corporate events: Everyone wants to relax, but nobody wants to be the first one to relax. It's a room full of people in expensive suits pretending they don't want to loosen their ties.</p>

      <p>Your bar is the solution to this paradox. It's the permission structure that lets the VP of Sales finally talk about something other than Q4 projections. But only if you do it right.</p>

      <blockquote>"The best corporate bartender is part therapist, part sommelier, and part CIA agent. They know everything and say nothing." - James, who's poured for every Fortune 500 company in Austin</blockquote>

      <h2>The Power Play Setup</h2>
      <p>I've seen bars tucked in corners like shameful secrets, and I've seen bars positioned like thrones. Guess which events people actually enjoy?</p>

      <p>The power position: As guests enter, the bar should be visible but not blocking. Left side, 15 feet from entrance. Why? Right-handed people (90% of your crowd) naturally drift left, and 15 feet gives them time to survey the room before committing to a drink. It's architectural psychology.</p>

      <div class="insider-tip">
        <h3>The Executive Bar Setup</h3>
        <p class="tip-intro">What actually impresses C-suite crowds:</p>
        <ul>
          <li>Backlit bottles at eye level (power positioning)</li>
          <li>Real glassware – death before plastic</li>
          <li>The WSJ test: bar surface clean enough to set down a newspaper</li>
          <li>Sound dampening materials (nobody wants to shout orders)</li>
          <li>Two bartenders minimum (waiting kills conversations)</li>
        </ul>
      </div>
      <h2>The Drink Decoder Ring</h2>
      <p>After years of corporate events, I can tell you exactly what your drink order says about you:</p>

      <p><strong>Vodka Soda:</strong> Either a CEO watching their calories or an intern trying not to smell like alcohol. No middle ground.</p>

      <p><strong>Old Fashioned:</strong> Wants you to know they appreciate craftsmanship. Will definitely mention their watch.</p>

      <p><strong>Wine:</strong> Safe player. Probably has opinions about the company's Q3 performance.</p>

      <p><strong>Beer:</strong> Either the most junior or most senior person in the room. Power has a horseshoe shape.</p>

      <p><strong>Mocktail:</strong> The smartest person here. They're taking notes on everything.</p>

      <h2>The Signature Cocktail Strategy</h2>
      <p>Here's where most corporate events fail: They create a "signature cocktail" that's really just a renamed Cosmo with the company colors. I watched a pharma company serve blue drinks at their launch. Blue. For medicine. The irony was lost on exactly no one.</p>

      <p>The signature cocktails that work tell a story. We did an event for a renewable energy company and created "The Solar Flare" – mezcal, yellow Chartreuse, fresh pineapple, and a flamed orange peel. It was smoky, sustainable (local ingredients), and had literal fire. The CEO used it in his speech. That's a win.</p>

      <div class="recipe-card">
        <h3>The Merger & Acquisition</h3>
        <p class="recipe-intro">The only cocktail that's literally stronger together</p>
        <ul>
          <li>1 oz Japanese whisky (the acquired company)</li>
          <li>1 oz bourbon (the acquiring company)</li>
          <li>0.5 oz Amaro (the lawyers)</li>
          <li>2 dashes chocolate bitters (makes everything better)</li>
          <li>Orange peel (for complexity)</li>
        </ul>
        <p><em>Stir with the confidence of a CEO announcing record profits. Serve over a perfectly clear ice cube that costs more than it should.</em></p>
      </div>

      <h2>The Networking Catalyst</h2>
      <p>The dirty secret of corporate events? The bar is where real business happens. I've seen more deals closed over whiskey than in any boardroom. But it only works if you design for it.</p>

      <p>The magic formula: Create zones. The main bar is for hellos and quick drinks. But that satellite bar by the windows? That's where the magic happens. Lower music, better lighting, and a bartender who knows when to disappear. I watched a $50M partnership form at one of those satellite bars. The participants didn't even realize they'd been architected into the perfect setting.</p>

      <h2>The Time Bomb Theory</h2>
      <p>Every corporate event has a detonation timeline:</p>

      <p><strong>First 30 minutes:</strong> Everyone's professional, orders are conservative, networking is stiff.</p>

      <p><strong>Hour 1-2:</strong> The sweet spot. Guards are down but not gone. Real conversations happen.</p>

      <p><strong>Hour 2-3:</strong> The danger zone. This is when the sales team challenges the engineers to "friendly" competitions.</p>

      <p><strong>Hour 3+:</strong> The exodus or the legend. Either everyone responsibly leaves, or tomorrow's HR meeting is born.</p>

      <p>Your bar program controls this timeline. Stronger drinks early means faster detonation. The pros know: Start with lower ABV, increase complexity not strength, and always have an exit strategy.</p>

      <h2>The Austin Advantage</h2>
      <p>Here's why Austin corporate events hit different: This city doesn't do stuffy. I've served senators in food trucks and tech titans in honky-tonks. The pretense that plagues corporate events in other cities? It melts faster than ice in August here.</p>

      <p>Use it. That rooftop overlooking Lady Bird Lake isn't just a venue – it's permission to loosen up. That Hill Country ranch isn't just rustic – it's an excuse to drop the corporate speak. Austin gives you cultural permission to make corporate events actually enjoyable.</p>

      <h2>The Million Dollar Pour</h2>
      <p>Let me tell you about the most expensive drink I ever served. It wasn't the Macallan 25 or the vintage champagne. It was a perfectly made Ramos Gin Fizz for a pharmaceutical exec who mentioned she hadn't had one since her honeymoon in New Orleans.</p>

      <p>That 12-minute shake (yes, it's supposed to take that long) led to a conversation about work-life balance, which led to her staying at the company, which led to her leading the team that developed their blockbuster drug. The bartender? He still gets a Christmas card with a very nice check.</p>

      <h2>Your Corporate Event Survival Guide</h2>
      <p>Forget the standard advice. Here's what actually matters:</p>

      <p><strong>The Guest List Reality:</strong> Plan for 70% attendance, but prepare for 100%. The "maybe" RSVPs always show up when the C-suite does.</p>

      <p><strong>The Brand Balance:</strong> Your company colors as cocktail ingredients is tacky. Your company values expressed through local sourcing and sustainable practices? That's sophisticated.</p>

      <p><strong>The Escape Hatch:</strong> Always have a graceful way to end the event. We use the "last call announcement" followed by coffee service. It's polite but clear.</p>

      <p><strong>The Morning After:</strong> Include hangover kits in your service. Pedialyte, aspirin, and a granola bar have saved more careers than any motivational speaker.</p>

      <h2>The Truth Nobody Admits</h2>
      <p>The best corporate events barely feel corporate. They feel like that dinner party where you made your best friend, that wedding where you danced until dawn, that random Tuesday when everything clicked.</p>

      <p>Your bar isn't serving drinks. It's serving permission – permission to be human in a world of KPIs and quarterly reports. Do that right, and you're not throwing a corporate event. You're creating the story they'll tell at the next one.</p>

      <p class="cta-text">Ready to transform your corporate event from mandatory to memorable? Let's design a bar experience that makes business feel like pleasure. Because the best deals are sealed with a handshake and the perfect cocktail.</p>

    `
  },
  {
    slug: 'the-night-we-saved-wedding-laguna-gloria',
    title: 'The Night We Saved a Wedding at Laguna Gloria',
    excerpt: 'A bartender\'s firsthand account of turning a catering crisis into an unforgettable celebration.',
    image: '/images/backgrounds/lake-travis-wedding-venue.webp',
    category: 'Event Planning',
    date: '2024-03-20',
    readTime: '7 min read',
    author: 'Carlos Mendoza',
    authorImage: '/images/authors/brian-hill.png',
    content: `
      <p class="lead">The father of the bride was turning purple. Not metaphorically – actually purple. It was 8:47 PM at Laguna Gloria, the museum's sculpture garden was lit like a Tuscan dream, 200 guests were watching, and our lead bartender had just informed me that the signature cocktail ingredient had been left in a cooler. In Buda. Forty-five minutes away.</p>

      <p>This is the story of how we saved the Patel-Morrison wedding, and why I now keep a secret stash of elderflower liqueur in my car at all times.</p>

      <h2>The Setup for Disaster</h2>
      <p>Laguna Gloria is one of those venues that looks effortless, which means it requires twice the effort. The Italian villa overlooking Lake Austin doesn't have a commercial kitchen. The sculpture garden has exactly three power outlets. The peacocks – yes, peacocks – have opinions about everything.</p>

      <p>The bride, Priya, had planned this fusion wedding for eighteen months. Her signature cocktail, "The Bombay Austin," required St-Germain elderflower liqueur, Tito's vodka, fresh lychee, and a cardamom-rose simple syrup we'd been perfecting for weeks. It was printed on custom napkins. It was mentioned in the vows. Her grandmother had blessed the recipe.</p>

      <p>And it was sitting in a cooler at our warehouse.</p>

      <h2>The Moment of Truth</h2>
      <p>When Carlos radioed me with the news, I had two choices: tell the bride on her wedding day that her signature cocktail was impossible, or perform a miracle. I looked at the sculpture garden, at the fairy lights reflecting off the lake, at Priya laughing with her sisters, and decided we were going for the miracle.</p>

      <p>First call: Jimmy at Twin Liquors on Lamar. Closed. Second call: Sarah at Spec's. Closing in twelve minutes. Third call: My competitor at another catering company. Voice mail.</p>

      <p>That's when Maria, our newest bartender, said five words that saved the night: "My roommate manages Péché."</p>

      <blockquote>"In the service industry, your competition today is your savior tomorrow. Remember that." - Lesson learned at 8:52 PM</blockquote>

      <h2>The Austin Miracle Network</h2>
      <p>What happened next could only happen in Austin. Maria's roommate called the bar manager at Péché, who called his buddy at The Roosevelt Room, who knew someone at Midnight Cowboy who was friends with the beverage director at Uchi.</p>

      <p>By 9:05 PM, we had St-Germain sources at four locations. By 9:10, my runner was speeding down MoPac with hazards on. By 9:15, three different bartenders from three different bars were meeting him with bottles. No payment requested – just "pay it forward."</p>

      <p>By 9:22 PM, we were making Bombay Austins.</p>

      <h2>The Peacock Incident</h2>
      <p>Of course, that's when the peacocks decided to get involved. If you've never been to Laguna Gloria, you should know: the peacocks own the place. We're just visitors.</p>

      <p>One particularly ambitious bird had discovered our garnish station. Picture this: a four-foot peacock, tail in full display, delicately eating $30-per-pound lychees while 200 wedding guests filmed it. The videos went viral. The bird has its own Instagram now.</p>

      <p>But here's what made it magic: instead of a disaster, it became the moment. Priya's aunt declared it auspicious. The photographer got the shot of the century. The peacock, now drunk on attention and lychees, photobombed the cake cutting.</p>

      <div class="insider-tip">
        <h3>The Laguna Gloria Survival Guide</h3>
        <p class="tip-intro">Hard-won wisdom from the trenches:</p>
        <ul>
          <li>Bring 200-foot extension cords. Trust me.</li>
          <li>The peacocks like fruit. Hide your garnishes.</li>
          <li>Sunset happens fast over the lake. Time speeches accordingly.</li>
          <li>The sculpture garden floods if it rains. Have a Plan B.</li>
          <li>Security guards are wine enthusiasts. Make friends early.</li>
        </ul>
      </div>

      <h2>The Recipe That Almost Wasn't</h2>
      <p>By the time we served the first round of Bombay Austins, the story had spread through the wedding. Guests weren't just drinking a cocktail – they were drinking a rescue mission, a community effort, proof that Austin takes care of its own.</p>

      <div class="recipe-card">
        <h3>The Bombay Austin</h3>
        <p class="recipe-intro">The cocktail worth crossing the city for</p>
        <ul>
          <li>2 oz Tito's Vodka</li>
          <li>0.75 oz St-Germain (worth the crisis)</li>
          <li>0.5 oz cardamom-rose syrup</li>
          <li>3 fresh lychees, muddled</li>
          <li>0.75 oz fresh lime juice</li>
          <li>Rose petals and gold leaf garnish</li>
        </ul>
        <p><em>Muddle lychees, add all ingredients, shake with the desperation of a bartender who almost ruined a wedding, double strain, garnish with the relief of disaster averted.</em></p>
      </div>

      <h2>The Dance Floor Verdict</h2>
      <p>Around 11 PM, I found myself on the edge of the dance floor, watching Priya's 75-year-old grandmother teaching the Morrison family to bhangra. The DJ was mixing Bollywood with Willie Nelson. Someone's uncle was doing the Cotton-Eyed Joe to a tabla beat.</p>

      <p>Priya found me during "September" by Earth, Wind & Fire (the song that unites all weddings, everywhere). "I heard what happened," she said. "With the St-Germain."</p>

      <p>My heart stopped.</p>

      <p>"That's the best wedding gift anyone could have given us," she continued. "Twenty years from now, we'll still be telling the story of how Austin saved our signature cocktail."</p>

      <h2>The Lessons from Laguna Gloria</h2>
      <p>Every wedding teaches you something. Here's what I learned that night:</p>

      <p><strong>Community is everything.</strong> Those bartenders who helped us? I've returned the favor three times over. Sarah from Spec's stayed open an extra ten minutes. Jimmy from Twin Liquors called me the next day to check how it went.</p>

      <p><strong>Disasters make stories.</strong> Nobody remembers perfect weddings. Everyone remembers the one where a peacock ate the garnishes and the whole city rallied to save the signature cocktail.</p>

      <p><strong>Preparation has limits.</strong> You can plan for eighteen months and still forget the St-Germain. What matters is how you improvise.</p>

      <p><strong>Austin is special.</strong> Try getting three competitor bars to loan you inventory at 9 PM on a Saturday in any other city. I'll wait.</p>

      <h2>The Morning After</h2>
      <p>The next morning, I got a text from Priya's father – the one who'd been turning purple when he heard about the missing liqueur. It was a photo from the sculpture garden at sunrise, empty glasses catching the morning light, a lone peacock surveying the scene.</p>

      <p>"Thank you for the perfect imperfection," it read.</p>

      <p>I keep that photo in my office. Next to my emergency elderflower liqueur.</p>

      <p class="cta-text">Every wedding has its moment of crisis. The difference between disaster and legend? Having a team that treats your emergency like their own. Let's create your perfect imperfection together.</p>
    `
  },
  {
    slug: 'rainey-street-ranch-weddings-cocktail-culture',
    title: 'From Rainey Street to Ranch Weddings: Austin\'s Cocktail Evolution',
    excerpt: 'How Austin\'s drinking culture has transformed post-pandemic and what it means for your event.',
    image: '/images/hero/austin-skyline-golden-hour.webp',
    category: 'Local Guides',
    date: '2024-03-18',
    readTime: '9 min read',
    author: 'Jessica Chen',
    authorImage: '/images/authors/allan-henslee.png',
    content: `
      <p class="lead">The bartender at Clive Bar paused mid-pour, looked at the bachelor party ordering Vegas Bombs, and said something that perfectly captured Austin's cocktail evolution: "Y'all sure you don't want to try our fermented tepache with mezcal instead?"</p>

      <p>Five years ago, that interaction would have ended with eye rolls. Last Saturday, those bros spent the next hour learning about agave cultivation. That's the new Austin – where craft consciousness has infiltrated even the most basic drinking occasions, and your wedding bar better keep up.</p>

      <h2>The Death and Rebirth of Rainey Street</h2>
      <p>Let's start with patient zero of Austin's drinking evolution: Rainey Street. If you haven't been since 2019, you're in for a shock. The bungalow bars that once served vodka-Red Bulls to college kids? Half are gone, replaced by towers of steel and glass. The survivors? They've gone upscale faster than you can say "gentrification."</p>

      <p>Banger's still anchors the strip, but now they're doing beer education seminars. Container Bar added a cocktail program that would make Liquid Gold jealous. Even Unbarlievable – yes, the place with the giant Jenga – now has a mezcal sommelier on weekends.</p>

      <blockquote>"Rainey Street died and came back as its sophisticated older brother who studied abroad and won't shut up about natural wine." - Every Austin bartender</blockquote>

      <h2>The Ranch Wedding Revolution</h2>
      <p>This evolution hit the wedding scene like a thunderstorm in May. Suddenly, couples who grew up doing shots on 6th Street wanted craft cocktail programs at their ranch weddings. The disconnect was real.</p>

      <p>I watched it happen at Vista West Ranch last spring. The couple wanted a "refined rustic" bar program. The venue had a BYOB license and a barn. The guests expected an open bar. The budget said "beer and wine only." The Pinterest board said "craft cocktail hour."</p>

      <p>Welcome to the new Austin paradox: champagne tastes, Lone Star budget, and a venue 45 minutes from the nearest liquor store.</p>

      <div class="insider-tip">
        <h3>The Ranch Reality Check</h3>
        <p class="tip-intro">What Instagram doesn't show you:</p>
        <ul>
          <li>Your craft ice will melt before cocktail hour</li>
          <li>That gorgeous barn? No running water</li>
          <li>Generators are loud. Cocktail shakers are louder</li>
          <li>Your bartender needs a headlamp after sunset</li>
          <li>Always, ALWAYS have a backup power plan</li>
        </ul>
      </div>

      <h2>The Agave Education Era</h2>
      <p>The biggest shift? Austin's obsession with agave spirits. Five years ago, wedding bars stocked Jose Cuervo and called it a day. Now, couples are requesting flights of ancestral mezcals and arguing about the merits of tahona-crushed versus roller-mill tequila.</p>

      <p>This isn't pretension – it's evolution. When Nixta opened and started serving $25 cocktails with corn husk smoke, Austin didn't blink. When The Roosevelt Room added a 400-bottle agave library, it became a pilgrimage site. Your wedding bar exists in this context.</p>

      <p>Last month, I served a wedding where the groom's father – a man who'd been drinking Bud Heavy since the Carter administration – asked for "something with espadin, but not too smoky." That's where we are now.</p>

      <h2>The Zero-Proof Zoom</h2>
      <p>Here's a stat that'll blow your mind: 35% of drinks served at Austin weddings in 2024 are now low or no-alcohol. Not because people are drinking less – they're drinking differently.</p>

      <p>The pandemic broke something fundamental: the assumption that celebration requires intoxication. When we emerged from our houses, we'd learned that connection matters more than cocktails, but good cocktails make connection better.</p>

      <p>Sans Bar on South Lamar isn't just surviving – it's thriving. Venues are requesting NA options that go beyond "Coke or Sprite?" Couples are dedicating entire sections of their bar menu to zero-proof cocktails that cost as much to make as their boozy counterparts.</p>

      <h2>The Local-Everything Movement</h2>
      <p>Austin's always been about keeping it local, but the cocktail scene took it to religious levels. Using Tito's isn't enough anymore – couples want Treaty Oak bourbon, Still Austin whiskey, and Desert Door sotol. They want their simple syrup made with Goodflow honey and their garnishes from Boggy Creek Farm.</p>

      <p>I catered a wedding at Prospect House where every single ingredient had to be sourced within 100 miles. Do you know how hard it is to find local tonic water? We ended up making our own with Texas grapefruit and Hill Country juniper. It was incredible. It was also insane.</p>

      <h2>The Instagram Influence</h2>
      <p>Let's address the elephant in the room: Instagram. Every wedding now needs a "signature moment," and increasingly, that moment involves the bar.</p>

      <p>Smoke bubbles. Color-changing cocktails. Garnishes that literally spark. Drinks served in everything but actual glasses – I've poured cocktails into miniature disco balls, hollow books, and (God help me) succulent planters that guests got to keep.</p>

      <p>The pressure to be "unique" has reached critical mass. Last week, a couple asked if we could do cocktails that match their sunset photos. Not inspired by – matching. We spent three hours color-matching tequila sunrises to their engagement photos.</p>

      <h2>The East Side Effect</h2>
      <p>Meanwhile, East Austin continued its transformation from dive bar paradise to craft cocktail corridor. The White Horse still does two-step lessons, but now they're also doing whiskey education. Nickel City added a natural wine program. Even Yellow Jacket Social Club – YELLOW JACKET – has craft cocktails now.</p>

      <p>This eastward evolution changed wedding geography. Suddenly, everyone wanted their reception "somewhere authentic on the East Side." The problem? Authentic East Austin venues come with authentic East Austin infrastructure – meaning none.</p>

      <div class="recipe-card">
        <h3>The New Austin Old Fashioned</h3>
        <p class="recipe-intro">Where tradition meets innovation</p>
        <ul>
          <li>2 oz Still Austin "The Musician" Bourbon</li>
          <li>0.25 oz Goodflow honey syrup</li>
          <li>2 dashes Bittermens Xocolatl Mole bitters</li>
          <li>1 dash Austin Cocktails Bergamot bitters</li>
          <li>Expressed Texas grapefruit peel</li>
          <li>Luxardo cherry from Antonelli's</li>
        </ul>
        <p><em>Stir with ice from Cuvée Coffee's crystal-clear ice program. Serve over a single cube with the Austin skyline frozen inside (yes, this is a real request we've gotten).</em></p>
      </div>

      <h2>The Venue Arms Race</h2>
      <p>As cocktail expectations soared, venues scrambled to keep up. The result? An arms race of amenities that would make 2019 blush.</p>

      <p>Barr Mansion added a greenhouse specifically for growing cocktail herbs. The Driskill trained their entire staff in cocktail history. Fair Market installed a custom ice program. Meanwhile, barn venues in Dripping Springs are still figuring out how to keep the lights on during toasts.</p>

      <p>The disconnect between expectation and infrastructure has never been wider. Couples see these magazine weddings with perfect craft cocktails in rustic settings and don't realize there's a generator the size of a truck just out of frame.</p>

      <h2>The Price Reality</h2>
      <p>Here's what nobody wants to talk about: craft costs. That beautiful cocktail program with local spirits, fresh juices, and artisan bitters? It's triple the cost of a standard bar.</p>

      <p>Pre-pandemic, couples budgeted 15% for beverages. Now, with craft expectations, it's pushing 25-30%. Add in the staff training required to execute these programs, and you're looking at bar tabs that rival venue costs.</p>

      <p>The kicker? Guests expect this level now. Serve a basic G&T at an Austin wedding in 2024, and watch the disappointment spread faster than cedar fever.</p>

      <h2>The Cultural Collision</h2>
      <p>The most interesting part of Austin's cocktail evolution? Watching different cultures blend at the bar. The Indian wedding featuring craft cocktails with cardamom and curry leaf. The Jewish celebration with artisan sufganiyot-inspired drinks. The Mexican-American reception where mezcal met tradition in ways that would make your abuela proud (or horrified).</p>

      <p>This cultural mixing created drinks you won't find anywhere else. Where else would you get a Korean-Mexican fusion cocktail featuring soju, tamarind, and gochujang? Only in Austin, only at weddings where families are literally mixing.</p>

      <h2>What This Means for Your Wedding</h2>
      <p>So where does this leave couples planning their big day? Stuck between the Austin they grew up in and the Austin that exists now. Between what they want and what they can afford. Between craft cocktail dreams and generator-powered reality.</p>

      <p>The successful weddings? They're the ones that embrace the evolution while respecting the roots. That serve Still Austin alongside Lone Star. That offer mezcal education and jello shots. That understand Austin isn't about choosing between high and low – it's about making both feel at home.</p>

      <h2>The Future of Austin Drinking</h2>
      <p>As I write this, three new cocktail bars are opening on the East Side. Rainey Street has four more towers under construction. Ranch venues are installing permanent bar infrastructure. The evolution continues.</p>

      <p>But here's what gives me hope: For all the craft cocktail sophistication, Austin still knows how to party. We just do it now with better ice, local spirits, and garnishes that might be on fire. The soul remains the same – we've just upgraded the vessel.</p>

      <p class="cta-text">Ready to navigate Austin's new cocktail landscape for your event? Let's create a bar program that honors where we've been while embracing where we're going. Because in Austin, evolution doesn't mean abandoning your roots – it means growing something beautiful from them.</p>
    `
  },
  {
    slug: 'lake-travis-hidden-party-coves',
    title: 'Lake Travis Locals Share Their Secret Party Spots',
    excerpt: 'Beyond Devil\'s Cove: discover the hidden gems where Austin\'s boat party insiders anchor.',
    image: '/images/hero/lake-life-hero.webp',
    category: 'Local Guides',
    date: '2024-03-12',
    readTime: '8 min read',
    author: 'Captain Jake Sullivan',
    authorImage: '/images/authors/brian-hill.png',
    content: `
      <p class="lead">Devil's Cove is dead to me. There, I said it. After fifteen years running boats on Lake Travis, watching that once-pristine party spot turn into a floating frat house complete with DJ battles and beer can graveyards, I'm ready to spill some secrets. But first, you've got to promise not to trash these places. Deal?</p>

      <p>Every weekend warrior with a rental pontoon knows about Devil's Cove, Hippie Hollow, and Starnes Island. They're on every "Best of Lake Travis" list, marked on every tourist map, and completely overrun by 2 PM on Saturdays. But Travis is 65 miles long with over 270 miles of shoreline. You really think the locals are fighting for anchor space with bachelor parties from Dallas?</p>

      <h2>The Captain's Code</h2>
      <p>Before I reveal anything, let's establish the rules. These spots stay secret because the people who know them follow an unspoken code:</p>

      <p><strong>Leave No Trace:</strong> Not a single can, bottle cap, or cigarette butt. If you brought it, you take it back.</p>
      
      <p><strong>Respect the Neighbors:</strong> Some of these coves have houses. Your music shouldn't rattle their windows.</p>
      
      <p><strong>Share the Space:</strong> First boat doesn't own the cove. There's room for everyone if we're not idiots about it.</p>
      
      <p><strong>Watch the Wildlife:</strong> Disturb a heron nest or eagle roost, and you're banned from the lake in my book.</p>

      <p>Break these rules, and the karma gods of Lake Travis will ensure your boat breaks down in the middle of the lake with no cell service. I've seen it happen.</p>

      <h2>The Pilot's Cove Alternative</h2>
      <p>Everyone hits Pilot's Cove for fuel and food, but here's what they miss: Just past the marina, there's an unmarked channel that leads to what locals call "The Pocket." It's a small inlet protected on three sides, deep enough for bigger boats, with a rope swing that's been there since the 90s.</p>

      <p>The best part? The cliff face creates a natural amphitheater. Your music sounds incredible but doesn't carry across the water. On full moon nights, the limestone glows like nature's mood lighting. I've seen more proposals here than anywhere else on the lake.</p>

      <p>Access tip: Come in from the north side of Pilot's Point, not the marina side. Watch for the partially submerged tree – it's been there forever and marks the safe channel.</p>

      <h2>The Bee Creek Secret</h2>
      <p>Bee Creek gets busy, sure. But 99% of boats stop at the first wide spot. Keep going – and I mean really keep going, past where it seems too narrow – and you'll find what we call "The Cathedral."</p>

      <p>Massive cypress trees create a canopy overhead. The water is always 5-10 degrees cooler. There's a natural beach on the east side that only appears when the lake level drops below 660 feet. When it's there, it's the finest sand on the entire lake.</p>

      <p>Warning: This is a no-wake zone for good reason. The creek narrows and winds. Treat it like church – quiet, respectful, and in complete awe of what nature created.</p>

      <h2>The West Side Story</h2>
      <p>Everyone gravitates to the east side of the lake. Meanwhile, the west side from Lakeway to Lago Vista hides coves that would be legendary if they were easier to reach. My favorite? A spot we call "Sunset Stadium."</p>

      <p>You have to know exactly where to turn off the main channel – there's no marked entrance, just a gap between two points that looks like solid shoreline until you're right on it. Inside, it opens into a perfect bowl with 270-degree cliff walls.</p>

      <p>The acoustics are unreal. I've hosted sunset concerts here with Austin musicians. The sun drops directly into the notch between the cliffs. It's the kind of place that makes you understand why the Tonkawa considered this lake sacred long before we flooded it.</p>

      <h2>The Mansfield Dam Mystery</h2>
      <p>Nobody parties near the dam. It's too far, too deep, too serious with its "DANGER" signs and restricted zones. But just south of the dam, there's a series of coves cut so deep into the limestone they're invisible from the main channel.</p>

      <p>The water here is the clearest on the lake – you can see 20 feet down on calm days. The depth keeps it cooler even in August. And because everyone assumes there's nothing here, you'll have it to yourself even on holiday weekends.</p>

      <p>Local knowledge: The third cove from the dam has a underwater cave system. Don't try to explore it – people have died. But the fish that live around it are massive. Bring a mask and snorkel.</p>

      <div class="insider-tip">
        <h3>The Weather Window Secret</h3>
        <p class="tip-intro">Want any spot to yourself? Here's the insider timing:</p>
        <ul>
          <li>Tuesday-Thursday mornings: Lakes like glass, locals only</li>
          <li>During UT games: Every Longhorn is glued to a screen</li>
          <li>First sunny day after rain: Everyone assumes the lake's dirty</li>
          <li>Full moon nights: Most afraid of night boating, missing the magic</li>
        </ul>
      </div>

      <h2>The Arkansas Bend Revelation</h2>
      <p>Arkansas Bend is where the Colorado River makes a hard turn. Everyone knows about the party cove there. Nobody knows about the protected inlet 500 yards south that we call "The Living Room."</p>

      <p>Natural rock ledges create perfect seating. The water's shallow enough to stand but deep enough to dive. Best feature? A natural infinity pool effect where water flows over a rock shelf. It's like nature designed the perfect boat party venue and forgot to charge admission.</p>

      <p>The approach requires local knowledge – submerged rocks guard the entrance like bouncers. Come in too fast or at the wrong angle, and you're calling Sea Tow. But navigate it right, and you've found Travis's best-kept secret.</p>

      <h2>The Graveyard Shift</h2>
      <p>Point Venture has a spot locals call "The Graveyard" – not because it's dangerous, but because of the ghost trees sticking up from the water. When the lake was flooded, this grove of oaks refused to rot. Now they're sculptures, bleached white by sun and time.</p>

      <p>Between these skeletal trees are channels deep enough for boats. It's hauntingly beautiful, especially at sunrise when mist rises off the water. The trees also create natural boat bumpers – tie off to one, and you're stable even in wind.</p>

      <p>Photography tip: This place at golden hour is unmatched. I've seen professional shoots here, models draped on the ghost trees like lake sirens.</p>

      <h2>The Pace Bend Paradise</h2>
      <p>Pace Bend Park gets crowded on land, but approach from the water, and you'll find coves the landlubbers can't reach. The best one requires navigating a narrow channel between limestone shelves – locals call it "Threading the Needle."</p>

      <p>Make it through, and you're in a natural lazy river. The current is gentle but noticeable, perfect for floating. The cove ends at a gravel beach accessible only by boat. On weekdays, you'll share it with nobody but the ospreys.</p>

      <h2>The Night Shift Secret</h2>
      <p>Here's something most don't know: The best party coves transform at night. That crowded spot becomes peaceful. The water turns to black glass. And if you know where to anchor, you can have experiences that beat any day party.</p>

      <p>My favorite night spot is a cove near Volente where the cliffs contain quartz. On full moon nights, the rock face literally sparkles. Add some underwater lights from your boat, and it's like partying inside a geode.</p>

      <p>Safety note: Night boating requires respect. No alcohol for the captain, proper navigation lights, and someone always on watch. The lake doesn't forgive stupid.</p>

      <h2>The Local's Calendar</h2>
      <p>Want to know when locals actually use the lake? Here's our seasonal guide:</p>

      <p><strong>March-April:</strong> Before the tourists arrive, when wildflowers bloom on the shores</p>
      
      <p><strong>September-October:</strong> Water's still warm, crowds are gone, sunsets are earlier</p>
      
      <p><strong>November-February:</strong> "Winter" boating when you need a wetsuit but have the lake to yourself</p>
      
      <p><strong>May-August:</strong> We're working, taking tourists to the obvious spots while our secrets rest</p>

      <h2>The Sacred Trust</h2>
      <p>I've broken fifteen years of silence sharing these spots. Not because I want them overrun, but because I believe the right people – the ones who read to the end, who respect the code – deserve to experience the real Lake Travis.</p>

      <p>These coves have hosted first dates that became marriages, business deals that built Austin, friendships that survived decades. They're not just party spots – they're where Austin comes to remember why we live here.</p>

      <p>Use them wisely. Protect them fiercely. And when some weekend warrior asks where the good spots are, smile and point them to Devil's Cove. Some secrets are earned, not given.</p>

      <p class="cta-text">Ready to experience Lake Travis like a local? Our boat party service knows every secret cove and the perfect one for your event. We bring the bar, you bring the crew, and Travis provides the magic. Because the best parties happen where Google Maps can't find you.</p>
    `
  },
  {
    slug: 'maid-of-honor-bachelorette-bar-stress',
    title: 'Why Your Maid of Honor is Secretly Stressed About the Bar',
    excerpt: 'The untold anxieties of planning bachelorette party drinks - and how to solve them.',
    image: '/images/services/bach-parties/bachelorette-champagne-tower.webp',
    category: 'Event Planning',
    date: '2024-03-08',
    readTime: '6 min read',
    author: 'Rachel Martinez',
    authorImage: '/images/authors/brian-hill.png',
    content: `
      <p class="lead">Your maid of honor hasn't slept in three days. Not because of her speech (she nailed that weeks ago), but because she's lying awake calculating drink math. How many bottles for 12 girls over a weekend? What if Sarah's still doing sober January in March? What if the bride's future sister-in-law only drinks rosé but everywhere is sold out of Whispering Angel?</p>

      <p>I've been that maid of honor. Five times. I've also bartended approximately 847 bachelorette parties. Let me tell you what's really keeping your MOH up at night – and more importantly, how to fix it.</p>

      <h2>The Mental Math Marathon</h2>
      <p>Here's a glimpse inside your MOH's brain at 2 AM:</p>

      <blockquote>"Okay, 12 girls, 3 days, figure 4-5 drinks per day, that's... 180 drinks? But Chelsea drinks like a fish and Aunt Karen had two sips of champagne at Christmas. Do I plan for the average or the extremes? What if we run out? What if I overbuy and have to haul 17 bottles of prosecco back home?"</blockquote>

      <p>The drink calculation isn't just math – it's psychology, sociology, and advanced game theory rolled into one. Your MOH is trying to predict the unpredictable: human behavior when mixed with alcohol, excitement, and matching t-shirts.</p>

      <h2>The Budget Bomb</h2>
      <p>Nobody talks about this part: Your MOH is probably fronting the money. Sure, everyone promises to Venmo their share. But Sarah's "having issues with her app," Jennifer "forgot" to factor in tax and tip, and somehow your MOH is out $500 waiting for reimbursements that trickle in like a broken faucet.</p>

      <p>Meanwhile, she's watching the bride's Instagram stories of champagne towers thinking, "That's my car payment popping in slow motion."</p>

      <p>The average bachelorette party bar tab in Austin? $150-300 per person per day. For a weekend with 12 people, your MOH is juggling a $5,000+ alcohol budget. That's not counting food, activities, or the matching swimsuits that seemed like a good idea at the time.</p>

      <h2>The Dietary Disaster</h2>
      <p>2024 is the year everyone has a thing. Gluten-free isn't enough – now it's sulfite-free, sugar-free, additive-free, joy-free. Your MOH's spreadsheet looks like this:</p>

      <div class="insider-tip">
        <h3>The Bachelorette Dietary Matrix</h3>
        <p class="tip-intro">A real MOH's planning document:</p>
        <ul>
          <li>Bride: No tequila (bad spring break memory)</li>
          <li>Sister: Keto (no sugar, carbs, or fun)</li>
          <li>College Roommate: Vegan (is champagne vegan?)</li>
          <li>Work Friend: Pregnant (surprise! announced via group text)</li>
          <li>Cousin: "Allergic" to cheap wine (isn't everyone?)</li>
          <li>Wild Card Friend: Drinks everything (thank god for Ashley)</li>
        </ul>
      </div>

      <p>Now try planning a bar menu that makes everyone happy. Spoiler: You can't. Your MOH knows this and is dying inside.</p>

      <h2>The Logistics Nightmare</h2>
      <p>Twelve women. Three locations. One rental house with a kitchen the size of a closet. Your MOH is playing Tetris with liquor bottles, trying to figure out how to transport everything without looking like she's running a bootlegging operation.</p>

      <p>The rental car only holds so much. TSA definitely won't let her bring 17 bottles of champagne on the plane. And shipping alcohol to Texas involves laws that make the tax code look simple.</p>

      <p>Then there's ice. Nobody thinks about ice until there isn't any. Your MOH has nightmares about warm champagne and the bride's disappointed face.</p>

      <h2>The Quality Question</h2>
      <p>Your MOH wants the bride to feel special. That means good champagne, not the stuff that tastes like sparkling regret. But good champagne for 12 people for three days? That's a mortgage payment.</p>

      <p>She's caught between her desire to give the bride the best and the reality of everyone's budgets. So she spends hours researching "best champagne under $30" and dying a little inside each time she adds a bottle of Yellow Tail to the cart.</p>

      <h2>The Morning After Management</h2>
      <p>Saturday night was epic. Sunday morning is apocalyptic. Your MOH is playing bartender-nurse, trying to remember if it's "beer before liquor" or "prayer before Uber to urgent care."</p>

      <p>She's making Bloody Marys with shaking hands, calculating how much pedialyte 12 hungover women need, and wondering if it's too early to start drinking again. Meanwhile, the bride is asking about brunch cocktails and the Type-A bridesmaid is suggesting a wine tour.</p>

      <h2>The Sober Support Stress</h2>
      <p>Plot twist: Two bridesmaids are doing Dry January/February/Forever. Your MOH now needs an entire parallel bar program. Mocktails that don't suck. Non-alcoholic options that aren't just juice. Making sure the sober sisters don't feel excluded from toasts.</p>

      <p>She's researching NA spirits at 3 AM, wondering if Seedlip is worth $35 a bottle, and calculating how many limes she needs for mocktails vs. cocktails. The mental load just doubled.</p>

      <h2>The Instagram Pressure</h2>
      <p>Every bachelorette party needs "content." Your MOH isn't just planning drinks – she's art directing them. The champagne wall needs to be "aesthetic." The cocktails need garnishes that photograph well. Everything needs to be "story-worthy."</p>

      <p>She's practicing champagne bottle opening techniques on YouTube, learning to make drinks that match the color scheme, and wondering when bachelorette parties became unpaid marketing internships.</p>

      <h2>The Transportation Tangle</h2>
      <p>Twelve drunk women. Multiple locations. One sober driver (hopefully). Your MOH is doing Advanced Calculus trying to figure out the Uber XL situation. Can you pre-book for 2 AM? How many cars do they need? What if they get separated?</p>

      <p>She's creating detailed spreadsheets with addresses, backup plans, and emergency contacts. She's the logistics coordinator for a small drunk army, and nobody appreciates the complexity.</p>

      <h2>The Emotional Weight</h2>
      <p>Here's what really keeps your MOH up: The pressure to create the perfect weekend. This is her best friend's last hurrah. The Instagram posts will live forever. The memories need to be epic.</p>

      <p>Every drink choice feels monumental. What if the signature cocktail sucks? What if they run out of the bride's favorite wine? What if this isn't as good as Jessica's bachelorette in Nashville?</p>

      <p>Your MOH is carrying the weight of expectations, comparisons, and the desperate desire to give her best friend the celebration she deserves.</p>

      <h2>The Solution Your MOH Needs</h2>
      <p>After my fifth stint as MOH, I discovered the secret: Stop trying to be the bartender. Hire professionals who do this every day. Let someone else calculate drinks per person, source the obscure NA options, and deal with the logistics.</p>

      <p>The best MOHs aren't the ones who DIY everything – they're the ones who know when to delegate. Your job is to be present for the bride, not to become a part-time liquor store manager.</p>

      <h2>The Permission Slip</h2>
      <p>If you're the bride reading this, here's what your MOH needs to hear: "I don't need perfect. I need you to enjoy this with me."</p>

      <p>If you're the MOH reading this at 3 AM while calculating drink ratios, here's your permission slip: You don't have to do this alone. The bride chose you because you're amazing, not because you moonlight as a sommelier.</p>

      <p>Outsource the bar. Split the responsibilities. Ask for help. Use a professional service. Whatever it takes to get you out of the Excel spreadsheet and into the matching t-shirts.</p>

      <p>Because the best bachelorette parties aren't the ones with perfect cocktails – they're the ones where the MOH actually gets to participate instead of bartend.</p>

      <p class="cta-text">Ready to save your sanity? Let us handle the bachelorette bar while you handle being the best MOH ever. Professional service, perfect portions, and peace of mind delivered. Because your job is to hold the bride's hair back, not calculate pour costs.</p>
    `
  }
]

// Mock related posts function
const getRelatedPosts = (currentSlug: string, category: string) => {
  return blogPosts
    .filter(post => post.slug !== currentSlug && (post.category === category || Math.random() > 0.5))
    .slice(0, 3)
}

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const canonicalUrl = `${seoConfig.siteUrl}/blog/${slug}`
  const jsonPost = blogPosts.find(p => p.slug === slug)

  if (jsonPost) {
    return {
      title: jsonPost.seo?.title || jsonPost.title,
      description: jsonPost.seo?.description || jsonPost.excerpt,
      keywords: jsonPost.seo?.keywords || jsonPost.tags,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: jsonPost.seo?.title || jsonPost.title,
        description: jsonPost.seo?.description || jsonPost.excerpt,
        url: canonicalUrl,
        type: 'article',
        publishedTime: jsonPost.publishedAt || jsonPost.date,
        authors: [jsonPost.author],
        images: jsonPost.image?.url ? [{ url: jsonPost.image.url, alt: jsonPost.image.alt }] : [],
      },
    }
  }

  const mdxPost = getMDXPost(slug)
  if (mdxPost) {
    return {
      title: mdxPost.title,
      description: mdxPost.excerpt,
      keywords: [mdxPost.category, ...mdxPost.keywords].filter(Boolean),
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: mdxPost.title,
        description: mdxPost.excerpt,
        url: canonicalUrl,
        type: 'article',
        publishedTime: mdxPost.date,
        authors: [mdxPost.author],
        images: mdxPost.image ? [{ url: mdxPost.image, alt: mdxPost.title }] : [],
      },
    }
  }

  return {
    title: 'Post Not Found',
    alternates: { canonical: canonicalUrl },
    robots: { index: false, follow: false },
  }
}

export async function generateStaticParams() {
  // Get all MDX posts from filesystem
  const mdxPosts = getAllMDXPosts()

  // Combine JSON posts and MDX posts
  return [
    ...blogPosts.map((post) => ({ slug: post.slug })),
    ...mdxPosts.map((post) => ({ slug: post.slug }))
  ]
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const resolvedParams = await params

  // First, check if it's an MDX post
  const mdxPost = getMDXPost(resolvedParams.slug)

  if (mdxPost) {
    const articleSchema = generateArticleSchema({
      title: mdxPost.title,
      description: mdxPost.excerpt,
      image: `${seoConfig.siteUrl}${mdxPost.image}`,
      datePublished: mdxPost.date,
      dateModified: mdxPost.date,
      author: mdxPost.author,
      url: `${seoConfig.siteUrl}/blog/${resolvedParams.slug}`,
    })

    return (
      <div className="bg-white min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
        <Navigation />

        {/* Hero Section with Image */}
        <section className="relative h-[60vh] min-h-[500px]">
          <Image
            src={mdxPost.image}
            alt={mdxPost.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="max-w-4xl mx-auto">
              <div>
                <div className="flex items-center gap-4 text-white/80 text-sm mb-4">
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 tracking-[0.1em]">
                    {mdxPost.category.toUpperCase()}
                  </span>
                  <span>{new Date(mdxPost.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <h1 className="font-heading text-4xl md:text-6xl text-white mb-4 tracking-[0.1em]">
                  {mdxPost.title}
                </h1>
                <p className="text-xl text-white/90 max-w-3xl">
                  {mdxPost.excerpt}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <article className="py-16 px-8">
          <div className="max-w-4xl mx-auto">
            <MDXContentRSC source={mdxPost.content} />

            {/* Topic-aware CTA card (routes to landing page for the post's category) */}
            <BlogTopicCTA slug={mdxPost.slug} />

            {/* Author Bio */}
            <div className="mt-16 pt-8 border-t border-gray-200">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={mdxPost.author === 'Allan Henslee'
                      ? '/images/authors/allan-henslee.png'
                      : mdxPost.author === 'Brian Hill'
                      ? '/images/authors/brian-hill.png'
                      : '/images/authors/allan-henslee.png'}
                    alt={mdxPost.author}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-2xl text-gray-900 mb-2">{mdxPost.author}</h3>
                  <p className="text-gray-600 mb-4">
                    {mdxPost.author === 'Allan Henslee'
                      ? 'Founder & CEO of Party On Delivery, helping Austin celebrate in style since 2023.'
                      : mdxPost.author === 'Brian Hill'
                      ? 'Co-founder of Party On Delivery, specializing in premium event experiences across Austin.'
                      : 'Content writer at Party On Delivery, sharing expert tips and insights for Austin events.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Social Sharing */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Share This Article</h3>
              <ShareButtons title={mdxPost.title} slug={mdxPost.slug} />
            </div>
          </div>
        </article>

        {/* Newsletter Section */}
        <section className="py-12 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center">
              <h2 className="font-heading text-3xl mb-4 tracking-[0.1em]">
                JOIN OUR INNER CIRCLE
              </h2>
              <p className="text-gray-300 mb-8">
                Get exclusive discounts, party planning tips, and be the first to know about new offerings
              </p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-yellow-500 text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.1em]"
                >
                  SUBSCRIBE
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-4">
                Join 5,000+ Austin party planners. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 bg-gray-900 text-white text-center">
          <div className="max-w-4xl mx-auto px-8">
            <div>
              <h2 className="font-heading text-3xl mb-4 tracking-[0.1em]">
                READY TO PLAN YOUR EVENT?
              </h2>
              <p className="text-gray-300 mb-8">
                Let our experts help you create the perfect beverage experience
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/order">
                  <button className="px-8 py-3 bg-yellow-500 text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.08em]">
                    ORDER NOW
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="px-8 py-3 border border-white text-white hover:bg-white hover:text-gray-900 transition-all tracking-[0.08em]">
                    GET IN TOUCH
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Fall back to mock blog posts
  const post = blogPosts.find(p => p.slug === resolvedParams.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(resolvedParams.slug, post.category || '')

  const articleSchema = generateArticleSchema({
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    image: `${seoConfig.siteUrl}${post.image?.url || '/images/hero/lake-travis-yacht-sunset.webp'}`,
    datePublished: post.publishedAt || post.date || new Date().toISOString(),
    dateModified: post.publishedAt || post.date || new Date().toISOString(),
    author: post.author,
    url: `${seoConfig.siteUrl}/blog/${resolvedParams.slug}`,
  })

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Navigation />
      
      {/* Hero Section with Image */}
      <section className="relative h-[60vh] min-h-[500px]">
        <Image
          src={post.image?.url || '/images/hero/lake-travis-yacht-sunset.webp'}
          alt={post.image?.alt || post.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="max-w-4xl mx-auto">
            <div>
              <div className="flex items-center gap-4 text-white/80 text-sm mb-4">
                {post.category && (
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 tracking-[0.1em]">
                    {post.category.toUpperCase()}
                  </span>
                )}
                <span>{new Date(post.date || post.publishedAt || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
                {post.readTime && (
                  <>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </>
                )}
              </div>
              <h1 className="font-heading text-4xl md:text-6xl text-white mb-4 tracking-[0.1em]">
                {post.title}
              </h1>
              <p className="text-xl text-white/90 max-w-3xl">
                {post.excerpt}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{
              fontFamily: 'Inter, sans-serif',
              color: '#374151',
              lineHeight: '1.75',
            }}
          />

          {/* Topic-aware CTA card (routes to landing page for the post's category) */}
          <BlogTopicCTA slug={post.slug} />

          {/* Author Bio */}
          <div
            className="mt-16 pt-8 border-t border-gray-200"
          >
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-2xl text-gray-900 mb-2">{post.author}</h3>
                <p className="text-gray-600 mb-4">
                  Senior Event Specialist at Party On Delivery with over 10 years of experience in the hospitality industry. 
                  Passionate about creating unforgettable experiences through expertly crafted beverage programs.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="text-yellow-500 hover:text-brand-yellow transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="#" className="text-yellow-500 hover:text-brand-yellow transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Social Sharing */}
          <div
            className="mt-12 pt-8 border-t border-gray-200"
          >
            <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Share This Article</h3>
            <ShareButtons title={post.title} slug={post.slug} />
          </div>
        </div>
      </article>

      {/* Newsletter Section */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-8">
          <div
            className="text-center"
          >
            <h2 className="font-heading text-3xl mb-4 tracking-[0.1em]">
              JOIN OUR INNER CIRCLE
            </h2>
            <p className="text-gray-300 mb-8">
              Get exclusive discounts, party planning tips, and be the first to know about new offerings
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <button
                type="submit"
                className="px-8 py-3 bg-yellow-500 text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.1em]"
              >
                SUBSCRIBE
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-4">
              Join 5,000+ Austin party planners. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8">
          <h2
            className="font-heading text-3xl text-center mb-12 tracking-[0.1em]"
          >
            RELATED ARTICLES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedPosts.map((relatedPost) => (
              <article
                key={relatedPost.slug}
                className="bg-white border border-gray-200 hover:border-yellow-500 transition-all duration-300 group"
              >
                <Link href={`/blog/${relatedPost.slug}`}>
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={relatedPost.image?.url || '/images/hero/lake-travis-yacht-sunset.webp'}
                      alt={relatedPost.image?.alt || relatedPost.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {relatedPost.category && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-white px-3 py-1 text-xs tracking-[0.1em] text-gray-700">
                          {relatedPost.category.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <time>{new Date(relatedPost.date || relatedPost.publishedAt || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</time>
                      {relatedPost.readTime && (
                        <>
                          <span>•</span>
                          <span>{relatedPost.readTime}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-heading text-xl text-gray-900 mb-3 group-hover:text-yellow-500 transition-colors">
                      {relatedPost.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-gray-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-8">
          <div>
            <h2 className="font-heading text-3xl mb-4 tracking-[0.1em]">
              READY TO PLAN YOUR EVENT?
            </h2>
            <p className="text-gray-300 mb-8">
              Let our experts help you create the perfect beverage experience
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/order">
                <button className="px-8 py-3 bg-yellow-500 text-gray-900 hover:bg-brand-yellow transition-colors tracking-[0.08em]">
                  ORDER NOW
                </button>
              </Link>
              <Link href="/contact">
                <button className="px-8 py-3 border border-white text-white hover:bg-white hover:text-gray-900 transition-all tracking-[0.08em]">
                  GET IN TOUCH
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}