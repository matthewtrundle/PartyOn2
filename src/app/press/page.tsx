import Hero from '@/components/Hero'
import Section from '@/components/Section'
import Link from 'next/link'

const pressReleases = [
  {
    date: "November 15, 2024",
    title: "Party On Delivery Introduces Biff: World's First AI Party Planning Assistant",
    excerpt: "Austin-based alcohol delivery service revolutionizes event planning with post-apocalyptic cowboy robot AI.",
    outlet: "TechCrunch Austin",
    link: "#"
  },
  {
    date: "October 3, 2024",
    title: "Party On Delivery Expands Lake Travis Services for Fall Wedding Season",
    excerpt: "Premium bar service now available at all major Lake Travis venues as demand surges.",
    outlet: "Austin Business Journal",
    link: "#"
  },
  {
    date: "August 22, 2024",
    title: "How One Austin Startup is Redefining the Party Experience",
    excerpt: "From 6th Street to Lake Travis, Party On Delivery brings premium service to every celebration.",
    outlet: "Austin Monthly",
    link: "#"
  },
  {
    date: "June 15, 2024",
    title: "Party On Delivery Named 'Best New Service' by Keep Austin Weird Awards",
    excerpt: "Local delivery service wins prestigious award for innovation and community impact.",
    outlet: "Austin Chronicle",
    link: "#"
  },
  {
    date: "March 10, 2024",
    title: "Austin's Bachelor Party Scene Gets a Premium Upgrade",
    excerpt: "New services cater to growing demand for upscale bachelor and bachelorette celebrations.",
    outlet: "Texas Monthly",
    link: "#"
  }
]

const mediaKit = {
  logos: [
    { name: "Primary Logo", format: "PNG/SVG", description: "Full color on light background" },
    { name: "White Logo", format: "PNG/SVG", description: "For dark backgrounds" },
    { name: "Icon Only", format: "PNG/SVG", description: "Square format for social media" }
  ],
  photos: [
    { name: "Service Photos", count: "50+", description: "High-res images of our services in action" },
    { name: "Team Photos", count: "20+", description: "Professional headshots and team photos" },
    { name: "Event Gallery", count: "100+", description: "Curated selection from Austin events" }
  ],
  facts: [
    "Founded in 2020 in Austin, Texas",
    "Served over 5,000 events",
    "500+ 5-star Google reviews",
    "First to offer AI party planning",
    "Licensed TABC provider",
    "Average delivery time: 27 minutes"
  ]
}

export default function PressPage() {
  return (
    <>
      <Hero
        title="Press & Media"
        subtitle="Party On in the News"
        description="Media resources and press coverage"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-6xl mx-auto">
          {/* Recent Coverage */}
          <div className="mb-16">
            <h2 className="font-display text-3xl text-dark text-center mb-8">Recent Coverage</h2>
            <div className="space-y-6">
              {pressReleases.map((release) => (
                <div key={release.title} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-wrap items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-primary-500 font-semibold">{release.outlet}</p>
                      <p className="text-xs text-dark/60">{release.date}</p>
                    </div>
                    <Link href={release.link} className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                      Read Article →
                    </Link>
                  </div>
                  <h3 className="font-display text-xl text-dark mb-2">{release.title}</h3>
                  <p className="text-dark/70">{release.excerpt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Media Kit */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h3 className="font-display text-2xl text-dark mb-6">Media Kit</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-dark mb-3">Brand Assets</h4>
                  <div className="space-y-2">
                    {mediaKit.logos.map((logo) => (
                      <div key={logo.name} className="flex justify-between items-center p-3 bg-light rounded">
                        <div>
                          <p className="font-medium text-sm text-dark">{logo.name}</p>
                          <p className="text-xs text-dark/60">{logo.description}</p>
                        </div>
                        <span className="text-xs text-dark/40">{logo.format}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-dark mb-3">Photography</h4>
                  <div className="space-y-2">
                    {mediaKit.photos.map((photo) => (
                      <div key={photo.name} className="flex justify-between items-center p-3 bg-light rounded">
                        <div>
                          <p className="font-medium text-sm text-dark">{photo.name}</p>
                          <p className="text-xs text-dark/60">{photo.description}</p>
                        </div>
                        <span className="text-xs text-dark/40">{photo.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="btn-primary w-full">
                  Download Media Kit
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-display text-2xl text-dark mb-6">Quick Facts</h3>
              <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-6">
                <ul className="space-y-3">
                  {mediaKit.facts.map((fact, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="text-primary-500 mt-1">•</span>
                      <span className="text-dark/80">{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 p-6 bg-dark text-white rounded-lg">
                <h4 className="font-semibold mb-2">Our Story in 60 Seconds</h4>
                <p className="text-sm text-white/80 mb-4">
                  Party On Delivery transforms Austin celebrations with premium alcohol delivery and 
                  full-service bar packages. From boat parties on Lake Travis to weddings in the 
                  Hill Country, we bring professional service and local expertise to every event. 
                  Our innovative AI party planner, Biff, helps customers create unforgettable experiences 
                  while our licensed, insured team ensures safety and quality.
                </p>
                <p className="text-xs text-white/60">Word count: 60</p>
              </div>
            </div>
          </div>

          {/* Press Contact */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h3 className="font-display text-2xl text-dark mb-4">Press Inquiries</h3>
            <p className="text-dark/70 mb-6">
              For media requests, interviews, or additional information, please contact our press team.
            </p>
            <div className="space-y-2 mb-6">
              <p className="text-dark">
                <span className="font-semibold">Email:</span> press@partyondelivery.com
              </p>
              <p className="text-dark">
                <span className="font-semibold">Phone:</span> (737) 371-9700 ext. 3
              </p>
              <p className="text-dark">
                <span className="font-semibold">Response Time:</span> Within 24 hours
              </p>
            </div>
            <a href="mailto:press@partyondelivery.com" className="btn-primary">
              Contact Press Team
            </a>
          </div>
        </div>
      </Section>
    </>
  )
}