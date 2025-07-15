import Hero from '@/components/Hero'
import Section from '@/components/Section'

const openPositions = [
  {
    title: "Delivery Driver",
    department: "Operations",
    type: "Full-time",
    location: "Austin, TX",
    description: "Join our elite delivery team bringing joy to Austin celebrations. Must have clean driving record and love to party (responsibly).",
    requirements: [
      "Valid Texas driver's license",
      "Clean driving record",
      "21+ years old",
      "Ability to lift 50 lbs",
      "Excellent customer service skills"
    ]
  },
  {
    title: "Event Bartender",
    department: "Events",
    type: "Part-time",
    location: "Austin & Lake Travis",
    description: "Craft cocktails and create memories at Austin&apos;s most exclusive events. TABC certification required.",
    requirements: [
      "TABC certified",
      "2+ years bartending experience",
      "Knowledge of craft cocktails",
      "Professional appearance",
      "Weekend availability"
    ]
  },
  {
    title: "Customer Success Specialist",
    department: "Support",
    type: "Full-time",
    location: "Austin, TX",
    description: "Be the voice of Party On! Help customers plan their perfect celebrations via phone, email, and chat.",
    requirements: [
      "Excellent communication skills",
      "Experience in customer service",
      "Knowledge of Austin venues",
      "Problem-solving abilities",
      "Party planning enthusiasm"
    ]
  },
  {
    title: "Social Media Manager",
    department: "Marketing",
    type: "Full-time",
    location: "Austin, TX (Hybrid)",
    description: "Capture and share Austin&apos;s best party moments. Must understand the local scene and have a creative eye.",
    requirements: [
      "3+ years social media experience",
      "Photography/videography skills",
      "Understanding of Austin culture",
      "Content creation expertise",
      "Analytics proficiency"
    ]
  }
]

const benefits = [
  {
    icon: "🎉",
    title: "Party Perks",
    description: "Employee discounts on all services plus VIP access to Austin events"
  },
  {
    icon: "🏥",
    title: "Health & Wellness",
    description: "Comprehensive health, dental, and vision coverage"
  },
  {
    icon: "🌴",
    title: "Time Off",
    description: "Generous PTO plus all major holidays (and some Austin-specific ones)"
  },
  {
    icon: "💰",
    title: "Competitive Pay",
    description: "Above-market salaries plus performance bonuses"
  },
  {
    icon: "📚",
    title: "Growth Opportunities",
    description: "TABC certification, leadership training, and career development"
  },
  {
    icon: "🚤",
    title: "Lake Days",
    description: "Monthly team outings on Lake Travis (yes, really)"
  }
]

export default function CareersPage() {
  return (
    <>
      <Hero
        title="Join the Party"
        subtitle="Careers at Party On Delivery"
        description="Help us make Austin&apos;s celebrations legendary"
        backgroundImage="/images/hero/festival-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-dark mb-4">
              Work Hard, Party Smart
            </h2>
            <p className="text-lg text-dark/70 max-w-2xl mx-auto">
              We&apos;re building something special in Austin. If you love this city, understand hospitality, 
              and want to be part of the party revolution, we want to meet you.
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-16">
            <h3 className="font-display text-2xl text-dark text-center mb-8">Why Party On?</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">{benefit.icon}</div>
                  <h4 className="font-semibold text-dark mb-2">{benefit.title}</h4>
                  <p className="text-sm text-dark/70">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Open Positions */}
          <div className="mb-16">
            <h3 className="font-display text-2xl text-dark text-center mb-8">Open Positions</h3>
            <div className="space-y-6">
              {openPositions.map((position) => (
                <div key={position.title} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-wrap items-start justify-between mb-4">
                      <div>
                        <h4 className="font-display text-xl text-dark mb-1">{position.title}</h4>
                        <div className="flex flex-wrap gap-2 text-sm text-dark/60">
                          <span>{position.department}</span>
                          <span>•</span>
                          <span>{position.type}</span>
                          <span>•</span>
                          <span>{position.location}</span>
                        </div>
                      </div>
                      <button className="btn-primary text-sm mt-4 sm:mt-0">
                        Apply Now
                      </button>
                    </div>
                    <p className="text-dark/70 mb-4">{position.description}</p>
                    <div>
                      <p className="font-semibold text-sm text-dark mb-2">Requirements:</p>
                      <ul className="space-y-1">
                        {position.requirements.map((req, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm text-dark/60">
                            <span className="text-primary-500 mt-1">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Culture Section */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 md:p-12 text-center">
            <h3 className="font-display text-2xl text-dark mb-4">Our Culture</h3>
            <p className="text-dark/70 max-w-2xl mx-auto mb-8">
              We&apos;re not your typical corporate environment. We&apos;re a startup with soul, built by Austin 
              locals who believe work should be fulfilling, fun, and meaningful. We celebrate wins, 
              learn from losses, and always keep the party going.
            </p>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold text-primary-500">500+</div>
                <p className="text-sm text-dark/60">Events Monthly</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-500">4.9★</div>
                <p className="text-sm text-dark/60">Employee Rating</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-500">25+</div>
                <p className="text-sm text-dark/60">Team Members</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-500">∞</div>
                <p className="text-sm text-dark/60">Party Potential</p>
              </div>
            </div>
          </div>

          {/* Application CTA */}
          <div className="text-center mt-12">
            <h3 className="font-display text-2xl text-dark mb-4">Don't See Your Role?</h3>
            <p className="text-dark/70 mb-6">
              We&apos;re always looking for talented people who share our vision. Send us your resume!
            </p>
            <a href="mailto:careers@partyondelivery.com" className="btn-outline">
              Send General Application
            </a>
          </div>
        </div>
      </Section>
    </>
  )
}