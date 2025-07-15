import Hero from '@/components/Hero'
import Section from '@/components/Section'
import Link from 'next/link'

export default function EastAustinPage() {
  return (
    <>
      <Hero
        title="East Austin Delivery"
        subtitle="Where Art Meets Party"
        description="Serving Austin's creative epicenter"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 mb-12">
            <div>
              <h2 className="font-display text-3xl text-dark mb-4">
                Austin's Cultural Revolution
              </h2>
              <p className="text-dark/70 mb-6">
                East Austin pulses with creativity - from converted warehouse venues to intimate 
                dive bars, food truck parks to art galleries. We deliver to every corner of this 
                vibrant neighborhood.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-500 font-bold">🎨</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">Creative District Delivery</h3>
                    <p className="text-sm text-dark/60">Studios, galleries, and venue spaces</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-secondary-500 font-bold">🌮</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">Food Truck Court Service</h3>
                    <p className="text-sm text-dark/60">Perfect pairings for your food adventures</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-6">
                <h3 className="font-display text-xl text-dark mb-4">East Side Favorites</h3>
                <div className="grid grid-cols-2 gap-4">
                  <ul className="space-y-2 text-sm text-dark/70">
                    <li className="font-semibold">Bars & Venues</li>
                    <li>• White Horse</li>
                    <li>• The Liberty</li>
                    <li>• Whisler's</li>
                    <li>• Lazarus Brewing</li>
                  </ul>
                  <ul className="space-y-2 text-sm text-dark/70">
                    <li className="font-semibold">Neighborhoods</li>
                    <li>• Holly</li>
                    <li>• East Cesar Chavez</li>
                    <li>• Mueller</li>
                    <li>• Cherrywood</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-dark mb-3">🎆 East Austin Events</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-dark/70">EAST Austin Studio Tour</span>
                    <span className="text-primary-500 font-medium">November</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-dark/70">Fusebox Festival</span>
                    <span className="text-primary-500 font-medium">April</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-dark/70">Hot Luck Festival</span>
                    <span className="text-primary-500 font-medium">May</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-dark/70">East Austin Food Fest</span>
                    <span className="text-primary-500 font-medium">September</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Service Types */}
          <div className="mb-12">
            <h3 className="font-display text-2xl text-dark text-center mb-8">East Austin Specials</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-4 text-center">🏢</div>
                <h4 className="font-semibold text-dark mb-2">Warehouse Parties</h4>
                <p className="text-sm text-dark/70 mb-4">
                  Full bar service for converted warehouse venues and industrial spaces
                </p>
                <ul className="text-xs text-dark/60 space-y-1">
                  <li>✓ Large format bottles</li>
                  <li>✓ Bulk ice delivery</li>
                  <li>✓ Professional setup</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg shadow-md p-6">
                <div className="text-3xl mb-4 text-center">🎨</div>
                <h4 className="font-semibold text-dark mb-2">Gallery Openings</h4>
                <p className="text-sm text-dark/70 mb-4">
                  Curated wine and cocktail service for art events and studio tours
                </p>
                <ul className="text-xs text-dark/60 space-y-1">
                  <li>✓ Natural wines</li>
                  <li>✓ Craft cocktails</li>
                  <li>✓ Elegant presentation</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-3xl mb-4 text-center">🎉</div>
                <h4 className="font-semibold text-dark mb-2">Block Parties</h4>
                <p className="text-sm text-dark/70 mb-4">
                  Community celebration packages for East Austin's famous block parties
                </p>
                <ul className="text-xs text-dark/60 space-y-1">
                  <li>✓ Kegs & cases</li>
                  <li>✓ Margarita stations</li>
                  <li>✓ Neighborhood pricing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cultural Note */}
          <div className="bg-dark text-white rounded-lg p-8 mb-12">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="font-display text-2xl mb-4">Supporting East Austin Culture</h3>
              <p className="text-white/80 mb-6">
                We're proud to serve the artists, musicians, chefs, and creators who make East Austin 
                special. We partner with local businesses and support community events that keep the 
                East Side authentic.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/10 rounded p-4">
                  <div className="text-2xl mb-2">🤝</div>
                  <p className="text-white/90">Local Business Partners</p>
                </div>
                <div className="bg-white/10 rounded p-4">
                  <div className="text-2xl mb-2">🎶</div>
                  <p className="text-white/90">Music Venue Support</p>
                </div>
                <div className="bg-white/10 rounded p-4">
                  <div className="text-2xl mb-2">🎆</div>
                  <p className="text-white/90">Festival Partnerships</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg p-8 text-center">
            <h3 className="font-display text-2xl mb-4">Ready to Party East Side Style?</h3>
            <p className="text-white/90 mb-6">
              From dive bar runs to gallery galas, we've got your East Austin celebration covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book-now" className="btn-primary bg-white text-dark hover:bg-gray-100">
                Book East Austin Delivery
              </Link>
              <a href="tel:7373719700" className="btn-outline border-white text-white hover:bg-white hover:text-dark">
                Call for Event Service
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}