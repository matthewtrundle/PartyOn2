import VideoHero from '@/components/VideoHero'
import ServiceCard from '@/components/ServiceCard'
import CTA from '@/components/CTA'
import Section from '@/components/Section'

export default function FastDeliveryPage() {
  const deliveryOptions = [
    {
      title: "Express Essentials",
      description: "Quick delivery of party favorites. Perfect for spontaneous gatherings and last-minute needs.",
      image: "/images/services/fast-delivery/motion-blur-delivery.png",
      features: [
        "30-minute delivery",
        "Popular spirits & beer",
        "Mixers & ice included",
        "Text updates",
        "No minimum order"
      ],
      price: "$15",
      priceLabel: "delivery fee",
      link: "/order-now"
    },
    {
      title: "Premium Rush",
      description: "Curated selection of premium spirits and craft cocktails delivered in record time.",
      image: "/images/products/delivery-bag-contents.png",
      features: [
        "20-minute priority delivery",
        "Premium spirit selection",
        "Craft cocktail kits",
        "Complimentary snacks",
        "White glove service"
      ],
      price: "$25",
      priceLabel: "delivery fee",
      link: "/order-now?tier=premium",
      featured: true
    },
    {
      title: "Party Pack ASAP",
      description: "Everything you need for an instant party. Full bar setup delivered and ready to serve.",
      image: "/images/services/fast-delivery/speed-focused-delivery.png",
      features: [
        "45-minute setup",
        "Complete bar package",
        "Cups, ice & garnishes",
        "Party playlist included",
        "Setup assistance"
      ],
      price: "$35",
      priceLabel: "delivery fee",
      link: "/order-now?tier=party"
    }
  ]

  const popularItems = [
    { name: "Tito's Vodka", time: "30 min", price: "$24.99" },
    { name: "High Noon Variety", time: "30 min", price: "$19.99" },
    { name: "Modelo 12-Pack", time: "30 min", price: "$16.99" },
    { name: "Casamigos Tequila", time: "30 min", price: "$44.99" },
    { name: "White Claw Pack", time: "30 min", price: "$17.99" },
    { name: "Josh Cabernet", time: "30 min", price: "$13.99" }
  ]

  const neighborhoods = [
    "Downtown", "South Congress", "East Austin", "West Lake",
    "Hyde Park", "Zilker", "Mueller", "The Domain",
    "Barton Hills", "Travis Heights", "Bouldin Creek", "Clarksville"
  ]

  return (
    <>
      {/* Hero Section */}
      <VideoHero
        title="Austin&apos;s Fastest Alcohol Delivery"
        subtitle="Cold Drinks, Hot Speed"
        description="Premium spirits, craft beer, and fine wine delivered to your door in 30 minutes or less. Track your order in real-time."
        videoSrc="/social_biff01_Austin_music_festival_crowd_going_wild_stage_lights_cr_073e551a-07a8-4bc6-a593-dfd47c0472d1_1.mp4"
        fallbackImage="/images/services/fast-delivery/motion-blur-delivery.png"
        ctaText="Order Now"
        ctaLink="/order-now"
        height="medium"
      />

      {/* How It Works */}
      <Section>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
            Party Delivery in 3 Easy Steps
          </h2>
          <p className="font-sans text-lg text-neutral-600">
            From browsing to buzzing in under 30 minutes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-gold rounded-full flex items-center justify-center">
              <span className="text-5xl text-white">1</span>
            </div>
            <h3 className="font-sans font-bold text-xl text-navy-500">Browse & Order</h3>
            <p className="font-sans text-neutral-600">
              Shop our curated selection of spirits, beer, wine, and party supplies. 
              Add to cart with a tap.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-gold rounded-full flex items-center justify-center">
              <span className="text-5xl text-white">2</span>
            </div>
            <h3 className="font-sans font-bold text-xl text-navy-500">Track in Real-Time</h3>
            <p className="font-sans text-neutral-600">
              Watch your order move from our warehouse to your door with live GPS tracking.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-gold rounded-full flex items-center justify-center">
              <span className="text-5xl text-white">3</span>
            </div>
            <h3 className="font-sans font-bold text-xl text-navy-500">Party Time!</h3>
            <p className="font-sans text-neutral-600">
              Receive your order with a smile. Everything arrives cold and ready to enjoy.
            </p>
          </div>
        </div>
      </Section>

      {/* Speed Stats */}
      <section className="section-padding bg-gradient-to-br from-austin-sunset/10 to-gold-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h2 className="font-serif text-4xl md:text-5xl text-navy-500">
                Speed That Impresses
              </h2>
              <p className="font-sans text-xl text-neutral-600 leading-relaxed">
                We've revolutionized alcohol delivery in Austin. Our strategic warehouse 
                locations and dedicated delivery fleet ensure your drinks arrive faster 
                than you can say "cheers!"
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <p className="font-display text-5xl text-gold-500">23</p>
                  <p className="font-sans text-sm text-neutral-600">Average delivery minutes</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <p className="font-display text-5xl text-gold-500">98%</p>
                  <p className="font-sans text-sm text-neutral-600">On-time delivery rate</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <p className="font-display text-5xl text-gold-500">15K+</p>
                  <p className="font-sans text-sm text-neutral-600">Monthly deliveries</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <p className="font-display text-5xl text-gold-500">4.9</p>
                  <p className="font-sans text-sm text-neutral-600">Star rating</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img
                src="/images/services/fast-delivery/speed-focused-delivery.png"
                alt="Delivery tracking map"
                className="rounded-2xl shadow-premium"
              />
              <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                <p className="font-sans font-bold text-sm text-gold-500">Live Tracking</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Options */}
      <Section className="bg-neutral-50">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
            Delivery Options for Every Occasion
          </h2>
          <p className="font-sans text-lg text-neutral-600">
            From a quick six-pack to a full party setup, we've got you covered
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {deliveryOptions.map((option, index) => (
            <div key={option.title} className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ServiceCard {...option} />
            </div>
          ))}
        </div>
      </Section>

      {/* Popular Items */}
      <Section>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
            Austin&apos;s Favorites
          </h2>
          <p className="font-sans text-lg text-neutral-600">
            Most ordered items ready for quick delivery
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularItems.map((item) => (
            <div key={item.name} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-sans font-bold text-lg text-navy-500">{item.name}</h3>
                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {item.time}
                </span>
              </div>
              <p className="font-sans text-2xl text-gold-500 mb-4">{item.price}</p>
              <button className="w-full btn-primary py-2">
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Coverage Area */}
      <section className="section-padding bg-gradient-to-br from-navy-50 to-austin-lake/10">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
              We Deliver All Over Austin
            </h2>
            <p className="font-sans text-lg text-neutral-600">
              From downtown lofts to lakeside homes, we've got Austin covered
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {neighborhoods.map((hood) => (
              <div 
                key={hood} 
                className="bg-white px-6 py-4 rounded-lg text-center hover:bg-gold-50 transition-colors"
              >
                <p className="font-sans font-medium text-navy-500">{hood}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="font-sans text-neutral-600 mb-4">
              Don't see your neighborhood? Enter your address to check coverage.
            </p>
            <button className="btn-secondary">
              Check My Address
            </button>
          </div>
        </div>
      </section>

      {/* App Download */}
      <Section>
        <div className="bg-gradient-to-br from-gold-100 to-austin-sunset/20 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-4xl text-navy-500">
                Order Even Faster with Our App
              </h2>
              <p className="font-sans text-lg text-neutral-600">
                Get exclusive app-only deals, save your favorites, and track deliveries 
                in real-time. Available for iOS and Android.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-sans">One-tap reorder your favorites</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-sans">Exclusive app-only discounts</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-sans">Schedule deliveries in advance</span>
                </li>
              </ul>
              <div className="flex gap-4">
                <button className="btn-primary">Download iOS App</button>
                <button className="btn-secondary">Download Android</button>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/services/fast-delivery/motion-blur-delivery.png"
                alt="Party On Delivery app"
                className="rounded-lg shadow-premium"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <section className="section-padding bg-neutral-50">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-navy-500 mb-4">
              Austin Loves Our Speed
            </h2>
            <p className="font-sans text-lg text-neutral-600">
              Real reviews from real Austinites
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-sans text-neutral-600 mb-4">
                "Ordered at 7:15, delivered by 7:35. Faster than getting pizza! 
                The driver even helped carry everything up to my apartment."
              </p>
              <p className="font-sans font-semibold">Michael R.</p>
              <p className="font-sans text-sm text-neutral-500">Downtown Austin</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-sans text-neutral-600 mb-4">
                "Game changer for hosting! Realized we were out of wine 20 minutes 
                before guests arrived. Party On saved the day!"
              </p>
              <p className="font-sans font-semibold">Lauren P.</p>
              <p className="font-sans text-sm text-neutral-500">Westlake Hills</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="font-sans text-neutral-600 mb-4">
                "Use them every weekend. The app is super easy and tracking is 
                spot on. Best alcohol delivery in Austin, hands down."
              </p>
              <p className="font-sans font-semibold">David K.</p>
              <p className="font-sans text-sm text-neutral-500">South Congress</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTA
        title="Thirsty? We&apos;re Already On Our Way"
        description="Join thousands of Austinites who rely on Party On for fast, reliable alcohol delivery. Your first delivery fee is on us!"
        primaryButtonText="Order Now - First Delivery Free"
        primaryButtonLink="/order-now"
        secondaryButtonText="Download Our App"
        secondaryButtonLink="/download-app"
        backgroundStyle="gradient"
      />
    </>
  )
}