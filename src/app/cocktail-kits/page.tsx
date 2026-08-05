import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import TrackedLink from '@/components/analytics/TrackedLink'
import CocktailKitsHero from './CocktailKitsHero'
import CocktailKitsProductSection from '@/components/CocktailKitsProductSection'
import July4CocktailKitsSection from '@/components/July4CocktailKitsSection'
import LuxuryCard from '@/components/LuxuryCard'
import { prisma } from '@/lib/database/client'
import { JULY4_KIT_HANDLES } from '@/lib/products/july4-kits'
import { transformToProduct } from '@/lib/products/transform'
import { Product } from '@/lib/types'

// Revalidate every 5 minutes
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Cocktail Kits | Austin Delivery | Party On Delivery',
  description: 'Premium cocktail kits delivered in Austin. Everything you need to make bar-quality margaritas, aperol spritzes, espresso martinis & more. Each kit makes 16-24 drinks!',
  keywords: 'cocktail kits Austin, margarita kit delivery, party kits, aperol spritz kit, espresso martini kit, Austin cocktail delivery',
  openGraph: {
    title: 'Premium Cocktail Kits | Party On Delivery',
    description: 'Everything you need to make bar-quality cocktails at home. Just add ice. Delivered in Austin.',
    images: ['/images/products/branded-delivery-bag.webp'],
  },
}


export default async function CocktailKitsPage() {
  // Fetch cocktail kit products via collection, ordered by position
  const category = await prisma.category.findFirst({
    where: { handle: 'cocktail-kits' },
  })

  const productCategories = category ? await prisma.productCategory.findMany({
    where: { categoryId: category.id, product: { status: 'ACTIVE' } },
    include: {
      product: {
        include: {
          images: { orderBy: { position: 'asc' } },
          variants: { include: { image: true }, orderBy: { createdAt: 'asc' } },
          categories: { include: { category: true } },
        },
      },
    },
    orderBy: { position: 'asc' },
  }) : []

  const cocktailKits = productCategories.map(pc => transformToProduct(pc.product))

  // --- July 4th seasonal trio (Red → True Blue → Coconut). Fetched by handle (not via the
  // collection) so the section is explicit and ordered; these kits also live in the cocktail-kits
  // category, so they're de-duped out of the grid below. Mirrors /austin-4th-of-july-delivery. ---
  const JULY4_HANDLES: string[] = [...JULY4_KIT_HANDLES]
  const july4Rows = await prisma.product.findMany({
    where: { handle: { in: JULY4_HANDLES }, status: 'ACTIVE' },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { include: { image: true }, orderBy: { createdAt: 'asc' } },
      categories: { include: { category: true } },
    },
  })
  const july4Kits: Product[] = []
  for (const handle of JULY4_HANDLES) {
    const row = july4Rows.find(r => r.handle === handle)
    if (row) july4Kits.push(transformToProduct(row))
  }
  const july4KitIds = new Set(july4Kits.map(kit => kit.id))

  // Find specific featured kits by name patterns
  const findKit = (pattern: string) =>
    cocktailKits.find((p: Product) =>
      p.title.toLowerCase().includes(pattern.toLowerCase())
    )

  // Get 4 specific featured kits
  const ladyBirdKit = findKit('lady bird margarita')
  const aperolSpritzKit = findKit('aperol spritz')
  const socoCarajilloKit = findKit('soco carajillo')
  const bartonSpringsMojitoKit = findKit('barton springs mojito')

  // Build array of 4 featured kits
  const featuredKits = [
    ladyBirdKit,
    aperolSpritzKit,
    socoCarajilloKit,
    bartonSpringsMojitoKit,
  ].filter(Boolean) as Product[]

  // Get IDs of featured kits to exclude from secondary grid
  const featuredKitIds = new Set(featuredKits.map(kit => kit.id))

  // Get other cocktail kits not in featured list (and not in the July 4th section above)
  const otherKits = cocktailKits.filter((kit: Product) =>
    !featuredKitIds.has(kit.id) && !july4KitIds.has(kit.id)
  )

  // Short, punchy subheadlines for each kit
  const kitSubheadlines: Record<string, string> = {
    'lady bird': 'Fresh Victor meets Lunazul Tequila. Our signature Austin margarita.',
    'aperol spritz': 'Light, bubbly, and perfect for warm days.',
    'soco carajillo': 'Cold brew, oat milk, and Licor 43. A smooth after-dinner crowd-pleaser.',
    'barton springs': 'White rum, fresh citrus, and mint. Cool and refreshing.',
    'austin rita': 'The perfect Austin party starter.',
    'espresso martini': 'The after-dinner crowd-pleaser.',
    'hill country old': 'A refreshing Texas twist on a classic.',
    'vodka lemonade': 'Refreshing and easy — a summer classic.',
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 to-gray-100 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text (hero A/B copy) */}
            <CocktailKitsHero />

            {/* Right Column - Hero Image */}
            <div className="relative">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src="/images/products/fresh-victor-cocktails/cocktail-kits-grid.png"
                  alt="Fresh Victor Cocktail Kits"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Trust Badges */}
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">24</div>
                  <div className="text-sm text-gray-700">Drinks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">$89.99</div>
                  <div className="text-sm text-gray-700">Complete Kit</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">72hrs</div>
                  <div className="text-sm text-gray-700">Delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* July 4th Cocktails! — seasonal red/white/blue trio */}
      <July4CocktailKitsSection kits={july4Kits} />

      {/* Featured Cocktail Kits - Split Layout */}
      <section id="featured-products" className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4">
              Our Most Popular Cocktail Kits
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Curated cocktail kits featuring local ingredients and classic recipes. Each makes 16-24 drinks!
            </p>
            <Link
              href="/cocktail-recipes"
              className="inline-block mt-4 text-sm font-medium text-brand-blue hover:underline"
            >
              Already have a kit? See the mixing instructions for every kit →
            </Link>
          </div>

          <CocktailKitsProductSection
            featuredKits={featuredKits}
            otherKits={otherKits}
            kitSubheadlines={kitSubheadlines}
          />
        </div>
      </section>

      {/* Why Choose a Cocktail Kit */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4">
              Why Choose a Cocktail Kit?
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Skip the store runs and impress your guests with bar-quality cocktails — no bartending experience required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <LuxuryCard>
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-2 font-semibold">
                  Everything in One Box
                </h3>
                <p className="text-gray-700">
                  No store trips needed. Premium tequila, mixers, and garnishes—all included and perfectly portioned.
                </p>
              </div>
            </LuxuryCard>

            <LuxuryCard>
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-2 font-semibold">
                  Makes 16-24 Drinks
                </h3>
                <p className="text-gray-700">
                  Way more value than a single bottle. Perfect for parties, gatherings, or enjoying over multiple occasions.
                </p>
              </div>
            </LuxuryCard>

            <LuxuryCard>
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-2 font-semibold">
                  Austin Local Ingredients
                </h3>
                <p className="text-gray-700">
                  Featuring Texas-made spirits and locally-sourced ingredients. Support Austin businesses with every order.
                </p>
              </div>
            </LuxuryCard>

            <LuxuryCard>
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-gray-900 mb-2 font-semibold">
                  Fast Austin Delivery
                </h3>
                <p className="text-gray-700">
                  Delivered right to your door. Schedule delivery for any date, or order same-day for last-minute plans.
                </p>
              </div>
            </LuxuryCard>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Getting party-ready cocktails is easy. Here&apos;s how:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500 text-gray-900 text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 tracking-wide">
                Choose Your Kit
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Browse our selection and pick the perfect cocktail kit. Austin Rita is our bestseller for a reason!
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500 text-gray-900 text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 tracking-wide">
                Add to Cart
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Select your kit size and add it to your cart. Mix and match kits for the ultimate party spread.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500 text-gray-900 text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 tracking-wide">
                We Deliver
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Enter your address and choose a delivery date. We&apos;ll bring everything right to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Real reviews from Austin customers who love our cocktail kits
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Review 1 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                &ldquo;We ordered the Austin Rita kit for our pool party and it was a huge hit. Made enough margaritas for everyone and the quality was amazing. So much easier than buying everything separately.&rdquo;
              </p>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-medium text-white">Sarah M.</p>
                <p className="text-sm text-gray-500">Austin, TX</p>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                &ldquo;The Espresso Martini kit is incredible. We had friends over for dinner and everyone was impressed. It felt like having a bartender at home. Already ordering another one for next weekend.&rdquo;
              </p>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-medium text-white">Mike R.</p>
                <p className="text-sm text-gray-500">Round Rock, TX</p>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                &ldquo;Game changer for hosting. We order a couple of kits whenever we have people over and it takes all the stress out of planning drinks. The delivery is always on time and everything is top quality.&rdquo;
              </p>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-medium text-white">Jennifer L.</p>
                <p className="text-sm text-gray-500">Westlake, TX</p>
              </div>
            </div>
          </div>

          {/* Google Review Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-full px-6 py-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-white font-medium">4.9 Rating on Google</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-sm">50+ Reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <details className="group border-b border-gray-200 pb-6">
              <summary className="flex justify-between items-center cursor-pointer text-lg font-semibold text-gray-900 hover:text-brand-yellow transition-colors">
                How many drinks does each kit make?
                <svg className="w-5 h-5 text-yellow-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Each kit makes between 16 and 24 cocktails depending on the recipe. The Austin Rita makes 24 margaritas — perfect for parties of any size.
              </p>
            </details>

            <details className="group border-b border-gray-200 pb-6">
              <summary className="flex justify-between items-center cursor-pointer text-lg font-semibold text-gray-900 hover:text-brand-yellow transition-colors">
                Do I need any equipment?
                <svg className="w-5 h-5 text-yellow-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Nope! Just add ice. Each kit comes with everything you need — spirits, mixers, garnishes, and instructions. A pitcher or large bowl is helpful for batch mixing, but not required.
              </p>
            </details>

            <details className="group border-b border-gray-200 pb-6">
              <summary className="flex justify-between items-center cursor-pointer text-lg font-semibold text-gray-900 hover:text-brand-yellow transition-colors">
                Can I add a personalized message?
                <svg className="w-5 h-5 text-yellow-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Yes! During checkout, you can add a personalized card with your message. Great for sending a kit to a friend or as a party host thank-you.
              </p>
            </details>

            <details className="group border-b border-gray-200 pb-6">
              <summary className="flex justify-between items-center cursor-pointer text-lg font-semibold text-gray-900 hover:text-brand-yellow transition-colors">
                What if I&apos;m not home for delivery?
                <svg className="w-5 h-5 text-yellow-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                We&apos;ll contact you to arrange a convenient delivery time. You can also provide special delivery instructions during checkout for safe drop-off locations.
              </p>
            </details>

            <details className="group border-b border-gray-200 pb-6">
              <summary className="flex justify-between items-center cursor-pointer text-lg font-semibold text-gray-900 hover:text-brand-yellow transition-colors">
                Is everything included in the cocktail kit?
                <svg className="w-5 h-5 text-yellow-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Yes! Each kit includes premium spirits, mixers, garnishes, and everything needed to make 16-24 cocktails. Just add ice and enjoy. No additional purchases needed.
              </p>
            </details>

            <details className="group border-b border-gray-200 pb-6">
              <summary className="flex justify-between items-center cursor-pointer text-lg font-semibold text-gray-900 hover:text-brand-yellow transition-colors">
                Do you deliver outside Austin?
                <svg className="w-5 h-5 text-yellow-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                We currently deliver throughout the Austin metro area, including downtown, South Congress, Lake Travis, Westlake, Round Rock, and Cedar Park. Contact us for specific delivery zone questions.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-yellow-500 to-brand-yellow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4">
            Ready to Party?
          </h2>
          <p className="text-xl mb-2 text-gray-900">
            Premium cocktail kits delivered to your door in Austin
          </p>
          <p className="text-lg mb-8 text-gray-700">
            Free Delivery on Orders $100+
          </p>
          <TrackedLink
            href="#featured-products"
            section="final_cta"
            buttonText="SHOP ALL COCKTAIL KITS"
            className="inline-block bg-gray-900 text-white hover:bg-gray-900 px-8 py-4 text-lg font-medium tracking-widest transition-colors duration-200"
          >
            SHOP ALL COCKTAIL KITS
          </TrackedLink>
        </div>
      </section>
    </div>
  )
}
