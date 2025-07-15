import Hero from '@/components/Hero'
import Section from '@/components/Section'
import Link from 'next/link'

const deliveryZones = [
  {
    name: "Downtown Austin",
    deliveryTime: "20-30 minutes",
    deliveryFee: "$8-12",
    popular: ["6th Street", "Rainey Street", "2nd Street District", "Convention Center"],
    link: "/areas/downtown"
  },
  {
    name: "Lake Travis",
    deliveryTime: "35-45 minutes",
    deliveryFee: "$15-25",
    popular: ["Lakeway Marina", "The Oasis", "Volente Beach", "Hudson Bend"],
    link: "/areas/lake-travis"
  },
  {
    name: "South Congress (SoCo)",
    deliveryTime: "20-30 minutes",
    deliveryFee: "$8-12",
    popular: ["South Congress Ave", "Travis Heights", "Bouldin Creek", "Zilker Park"],
    link: "/areas/south-congress"
  },
  {
    name: "East Austin",
    deliveryTime: "20-30 minutes",
    deliveryFee: "$8-12",
    popular: ["East 6th Street", "Holly", "Cesar Chavez", "Mueller"],
    link: "/areas/east-austin"
  },
  {
    name: "North Austin",
    deliveryTime: "25-35 minutes",
    deliveryFee: "$10-15",
    popular: ["The Domain", "Arboretum", "North Loop", "Hyde Park"]
  },
  {
    name: "West Austin",
    deliveryTime: "25-35 minutes",
    deliveryFee: "$10-15",
    popular: ["Westlake", "Tarrytown", "West 6th", "Clarksville"]
  },
  {
    name: "South Austin",
    deliveryTime: "25-35 minutes",
    deliveryFee: "$10-15",
    popular: ["Sunset Valley", "Oak Hill", "Brodie Lane", "William Cannon"]
  },
  {
    name: "Hill Country",
    deliveryTime: "45-60 minutes",
    deliveryFee: "$25-40",
    popular: ["Dripping Springs", "Bee Cave", "Spicewood", "West Lake Hills"]
  }
]

export default function DeliveryAreasPage() {
  return (
    <>
      <Hero
        title="Delivery Areas"
        subtitle="We Bring the Party to You"
        description="Fast, reliable delivery across Austin and Lake Travis"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-dark mb-4">
              Serving All of Austin
            </h2>
            <p className="text-lg text-dark/70 max-w-2xl mx-auto">
              From downtown to the lake, we deliver premium spirits and full bar services 
              wherever your party takes you.
            </p>
          </div>

          {/* Delivery Zones Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {deliveryZones.map((zone) => (
              <div key={zone.name} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <h3 className="font-display text-xl text-dark mb-3">{zone.name}</h3>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-dark/60">Delivery Time:</span>
                    <span className="text-sm font-semibold text-primary-500">{zone.deliveryTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-dark/60">Delivery Fee:</span>
                    <span className="text-sm font-semibold text-dark">{zone.deliveryFee}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-dark/60 mb-2">Popular Areas:</p>
                  <div className="flex flex-wrap gap-1">
                    {zone.popular.map((area) => (
                      <span key={area} className="text-xs bg-light px-2 py-1 rounded text-dark/70">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {zone.link && (
                  <Link href={zone.link} className="block mt-4 text-center text-sm text-primary-500 hover:text-primary-600 font-medium">
                    Learn More →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Service Map Placeholder */}
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-8 mb-12">
            <h3 className="font-display text-2xl text-dark text-center mb-4">Interactive Delivery Map</h3>
            <div className="bg-white rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-primary-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-dark/60">Enter your address above to check delivery availability</p>
              </div>
            </div>
          </div>

          {/* Special Services */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-display text-xl text-dark mb-4">Boat Delivery</h3>
              <p className="text-dark/70 mb-4">
                We&apos;re Lake Travis&apos;s premier boat delivery service. We deliver to all major marinas 
                and can coordinate with your captain for on-water delivery.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-primary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Lakeway Marina</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Volente Beach</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Hudson Bend</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Sail & Ski Marina</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-display text-xl text-dark mb-4">Event Venue Delivery</h3>
              <p className="text-dark/70 mb-4">
                We partner with Austin&apos;s top venues to provide seamless bar service for weddings, 
                corporate events, and private parties.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-secondary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Hill Country venues</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-secondary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Downtown hotels</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-secondary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Private estates</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-secondary-500 mt-1">•</span>
                  <span className="text-sm text-dark/70">Corporate offices</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Outside Delivery Area */}
          <div className="bg-dark text-white rounded-lg p-8 text-center">
            <h3 className="font-display text-2xl mb-4">Outside Our Regular Delivery Area?</h3>
            <p className="text-white/80 mb-6">
              We can still help! For special events and large orders, we offer extended delivery 
              to surrounding areas including Bastrop, Georgetown, and San Marcos.
            </p>
            <a href="/contact" className="btn-primary bg-white text-dark hover:bg-gray-100">
              Request Special Delivery
            </a>
          </div>
        </div>
      </Section>
    </>
  )
}