import Hero from '@/components/Hero'
import Section from '@/components/Section'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <>
      <Hero
        title="Our Story"
        subtitle="Bringing the Party to Austin Since 2020"
        description="From a simple idea to Austin's premier alcohol delivery service"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      {/* Mission Section */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-dark mb-4">
              Redefining Austin&apos;s Party Scene
            </h2>
            <p className="text-lg text-dark/70 max-w-2xl mx-auto">
              We believe every celebration deserves premium service, whether it&apos;s a boat party on Lake Travis 
              or a wedding in the Hill Country.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="font-display text-2xl text-dark mb-4">Our Mission</h3>
              <p className="text-dark/70 mb-6">
                To deliver exceptional experiences that elevate Austin celebrations. We&apos;re not just bringing 
                alcohol – we&apos;re bringing the expertise, reliability, and local knowledge that turns good 
                parties into legendary ones.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <p className="text-dark/70">Premium spirits and local favorites</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <p className="text-dark/70">Licensed, insured, and professional</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <p className="text-dark/70">Supporting Austin&apos;s vibrant culture</p>
                </div>
              </div>
            </div>
            <div className="relative h-96 rounded-lg overflow-hidden shadow-xl">
              <Image
                src="/images/gallery/party-headquarters.webp"
                alt="Party On Delivery Team"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Story Timeline */}
          <div className="mb-16">
            <h3 className="font-display text-2xl text-dark text-center mb-8">Our Journey</h3>
            <div className="space-y-8">
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="text-sm font-semibold text-primary-500">2020</span>
                </div>
                <div className="w-4 h-4 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                <div className="flex-grow pb-8">
                  <h4 className="font-semibold text-dark mb-2">The Beginning</h4>
                  <p className="text-dark/70">
                    Started with a simple idea: Austin deserves better party delivery. Founded by local 
                    hospitality veterans who saw the need for premium, reliable alcohol delivery.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="text-sm font-semibold text-primary-500">2021</span>
                </div>
                <div className="w-4 h-4 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                <div className="flex-grow pb-8">
                  <h4 className="font-semibold text-dark mb-2">Lake Travis Expansion</h4>
                  <p className="text-dark/70">
                    Launched boat party packages, becoming the go-to service for Lake Travis celebrations. 
                    Partnered with marinas and boat rental companies.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="text-sm font-semibold text-primary-500">2022</span>
                </div>
                <div className="w-4 h-4 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                <div className="flex-grow pb-8">
                  <h4 className="font-semibold text-dark mb-2">Wedding Services Launch</h4>
                  <p className="text-dark/70">
                    Added full-service bar packages for weddings. Served over 100 Hill Country weddings 
                    with our premium bartending team.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="text-sm font-semibold text-primary-500">2023</span>
                </div>
                <div className="w-4 h-4 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                <div className="flex-grow pb-8">
                  <h4 className="font-semibold text-dark mb-2">AI Innovation</h4>
                  <p className="text-dark/70">
                    Introduced Biff, our AI party planner, revolutionizing how Austin plans celebrations. 
                    First in the industry to offer AI-powered party consultation.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="text-sm font-semibold text-primary-500">Today</span>
                </div>
                <div className="w-4 h-4 bg-accent-500 rounded-full flex-shrink-0 mt-1"></div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-dark mb-2">Austin&apos;s #1 Choice</h4>
                  <p className="text-dark/70">
                    Serving 2,000+ events annually, from intimate gatherings to massive celebrations. 
                    The trusted name in Austin party delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="bg-light rounded-2xl p-8 md:p-12">
            <h3 className="font-display text-2xl text-dark text-center mb-8">Our Values</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-dark mb-2">Keep Austin Weird</h4>
                <p className="text-sm text-dark/70">
                  We celebrate Austin&apos;s unique culture and support local businesses in everything we do.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-dark mb-2">Safety First</h4>
                <p className="text-sm text-dark/70">
                  Licensed, insured, and committed to responsible service. Every celebration should be safe.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-dark mb-2">Always Deliver</h4>
                <p className="text-sm text-dark/70">
                  Rain or shine, we show up. Your celebration is our priority, every single time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}