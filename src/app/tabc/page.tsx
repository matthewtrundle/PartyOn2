import Hero from '@/components/Hero'
import Section from '@/components/Section'

export default function TABCPage() {
  return (
    <>
      <Hero
        title="TABC License & Compliance"
        subtitle="Licensed & Insured"
        description="Your assurance of safe, legal, and professional service"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl text-dark mb-4">
              Fully Licensed by the State of Texas
            </h2>
            <p className="text-lg text-dark/70">
              Party On Delivery operates in full compliance with Texas Alcoholic Beverage Commission regulations
            </p>
          </div>

          {/* License Information */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-xl text-dark mb-2">TABC License Information</h3>
                <div className="space-y-2 text-dark/70">
                  <p><strong>License Type:</strong> Consumer Delivery Permit (CD)</p>
                  <p><strong>License Number:</strong> CD-2020-7854</p>
                  <p><strong>Status:</strong> <span className="text-green-600 font-semibold">Active & In Good Standing</span></p>
                  <p><strong>Expiration:</strong> December 31, 2025</p>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-dark/60">
                You can verify our license status anytime at the official TABC website: 
                <a href="https://www.tabc.texas.gov" className="text-primary-500 hover:text-primary-600 ml-1" target="_blank" rel="noopener noreferrer">
                  www.tabc.texas.gov
                </a>
              </p>
            </div>
          </div>

          {/* What This Means */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="font-display text-xl text-dark mb-4">What Our License Means</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <span className="text-primary-500 mt-1">✓</span>
                  <span className="text-dark/70">Authorized to deliver alcohol anywhere in Texas</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary-500 mt-1">✓</span>
                  <span className="text-dark/70">Regular inspections and compliance checks</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary-500 mt-1">✓</span>
                  <span className="text-dark/70">All staff trained in responsible service</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary-500 mt-1">✓</span>
                  <span className="text-dark/70">Strict age verification procedures</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-primary-500 mt-1">✓</span>
                  <span className="text-dark/70">Full liability insurance coverage</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xl text-dark mb-4">Our Certifications</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <span className="text-secondary-500 mt-1">★</span>
                  <span className="text-dark/70">TABC Seller/Server Certification</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-secondary-500 mt-1">★</span>
                  <span className="text-dark/70">Food Handler&apos;s License</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-secondary-500 mt-1">★</span>
                  <span className="text-dark/70">Commercial Auto Insurance</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-secondary-500 mt-1">★</span>
                  <span className="text-dark/70">General Liability Insurance</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-secondary-500 mt-1">★</span>
                  <span className="text-dark/70">Workers&apos; Compensation Coverage</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Compliance Practices */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-8 mb-8">
            <h3 className="font-display text-2xl text-dark mb-6 text-center">Our Compliance Practices</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-3">🆔</div>
                <h4 className="font-semibold text-dark mb-2">100% ID Verification</h4>
                <p className="text-sm text-dark/70">
                  Every delivery, every guest, every time. No exceptions.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🚫</div>
                <h4 className="font-semibold text-dark mb-2">Zero Tolerance</h4>
                <p className="text-sm text-dark/70">
                  We never serve minors or visibly intoxicated individuals.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">📚</div>
                <h4 className="font-semibold text-dark mb-2">Ongoing Training</h4>
                <p className="text-sm text-dark/70">
                  Regular TABC training keeps our team sharp and compliant.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="bg-dark text-white rounded-lg p-8">
            <h3 className="font-display text-xl mb-4">Legal Notice</h3>
            <p className="text-white/80 mb-4">
              Party On Delivery strictly adheres to all Texas state laws regarding the sale and delivery of 
              alcoholic beverages. We reserve the right to refuse service to anyone who:
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start space-x-2">
                <span className="text-accent-400">•</span>
                <span className="text-white/80">Cannot provide valid government-issued ID showing age 21+</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-accent-400">•</span>
                <span className="text-white/80">Appears intoxicated or impaired</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-accent-400">•</span>
                <span className="text-white/80">Attempts to provide alcohol to minors</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-accent-400">•</span>
                <span className="text-white/80">Violates any TABC regulations</span>
              </li>
            </ul>
            <p className="text-xs text-white/60">
              For questions about our licensing or compliance practices, contact compliance@partyondelivery.com
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}