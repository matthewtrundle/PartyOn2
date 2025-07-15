import Hero from '@/components/Hero'
import Section from '@/components/Section'
import Link from 'next/link'

export default function DowntownAustinPage() {
  return (
    <>
      <Hero
        title="Downtown Austin Delivery"
        subtitle="From 6th Street to Rainey Street"
        description="Fast delivery to Austin&apos;s entertainment heart"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 mb-12">
            <div>
              <h2 className="font-display text-3xl text-dark mb-4">
                The Heartbeat of Austin Nightlife
              </h2>
              <p className="text-dark/70 mb-6">
                Whether you&apos;re bar hopping on 6th Street, enjoying rooftop cocktails, or hosting a 
                corporate event downtown, we deliver premium spirits in 20-30 minutes.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-500 font-bold">🚚</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">Average Delivery: 22 minutes</h3>
                    <p className="text-sm text-dark/60">Fastest service in the city</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-secondary-500 font-bold">📍</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">Delivery Fee: $8-12</h3>
                    <p className="text-sm text-dark/60">Based on exact location</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-8">
              <h3 className="font-display text-xl text-dark mb-4">Popular Downtown Locations</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-dark mb-2">Entertainment</h4>
                  <ul className="space-y-1 text-sm text-dark/70">
                    <li>• 6th Street Historic District</li>
                    <li>• Rainey Street</li>
                    <li>• Red River District</li>
                    <li>• 2nd Street District</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-dark mb-2">Hotels & Venues</h4>
                  <ul className="space-y-1 text-sm text-dark/70">
                    <li>• Convention Center</li>
                    <li>• W Austin</li>
                    <li>• JW Marriott</li>
                    <li>• The Driskill</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="mb-12">
            <h3 className="font-display text-2xl text-dark text-center mb-8">Downtown Services</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl mb-4">🏢</div>
                <h4 className="font-semibold text-dark mb-2">Corporate Events</h4>
                <p className="text-sm text-dark/70">
                  Premium bar service for office parties, client events, and conferences
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl mb-4">🎶</div>
                <h4 className="font-semibold text-dark mb-2">Festival Support</h4>
                <p className="text-sm text-dark/70">
                  SXSW, ACL, and special event delivery with VIP service
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl mb-4">🏆</div>
                <h4 className="font-semibold text-dark mb-2">Game Day Delivery</h4>
                <p className="text-sm text-dark/70">
                  Quick delivery for UT games and downtown watch parties
                </p>
              </div>
            </div>
          </div>

          {/* Special Note */}
          <div className="bg-dark text-white rounded-lg p-8 text-center">
            <h3 className="font-display text-xl mb-4">Event Day Surge?</h3>
            <p className="text-white/80 mb-6">
              During major events like SXSW or Formula 1, order early! We increase staff but 
              demand is always high.
            </p>
            <Link href="/book-now" className="btn-primary bg-white text-dark hover:bg-gray-100">
              Book Downtown Delivery
            </Link>
          </div>
        </div>
      </Section>
    </>
  )
}