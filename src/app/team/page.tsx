import Hero from '@/components/Hero'
import Section from '@/components/Section'
import Image from 'next/image'

const teamMembers = [
  {
    name: "Jake Martinez",
    role: "Founder & CEO",
    bio: "Austin native with 15 years in hospitality. Started Party On after seeing too many celebrations ruined by unreliable service.",
    image: "/images/team/jake.webp",
    funFact: "Can name every bar on 6th Street"
  },
  {
    name: "Sarah Chen",
    role: "Chief Operations Officer",
    bio: "Former Amazon logistics manager who brings world-class delivery expertise to Austin's party scene.",
    image: "/images/team/sarah.webp",
    funFact: "Holds the Lake Travis wakeboarding record"
  },
  {
    name: "Marcus Thompson",
    role: "Head of Bartending Services",
    bio: "20+ years crafting cocktails at Austin's finest establishments. TABC certified instructor.",
    image: "/images/team/marcus.webp",
    funFact: "Invented the 'Austin Sunrise' cocktail"
  },
  {
    name: "Biff",
    role: "AI Party Planning Specialist",
    bio: "Post-apocalyptic cowboy robot from 2145. Survived the Great Texas Party Drought of 2089. Now helps Austin party like there's no tomorrow.",
    image: "/images/ai-assistant/biff-bartender-cowboy.webp",
    funFact: "Powered by pure party energy"
  },
  {
    name: "Emma Rodriguez",
    role: "Wedding Services Director",
    bio: "Planned over 500 Hill Country weddings. Knows every venue from Dripping Springs to Fredericksburg.",
    image: "/images/team/emma.webp",
    funFact: "Got married at all her top 3 venues"
  },
  {
    name: "Tyler Brooks",
    role: "Lake Travis Operations Manager",
    bio: "Boat captain turned logistics expert. Ensures every lake party gets premium service, even in rough waters.",
    image: "/images/team/tyler.webp",
    funFact: "Can navigate Lake Travis blindfolded"
  }
]

export default function TeamPage() {
  return (
    <>
      <Hero
        title="Meet the Crew"
        subtitle="The Legends Behind Your Legendary Parties"
        description="Austin locals dedicated to elevating your celebrations"
        backgroundImage="/images/hero/austin-skyline-golden-hour.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-dark mb-4">
              Powered by Austin Spirit
            </h2>
            <p className="text-lg text-dark/70 max-w-2xl mx-auto">
              We're not just a team – we're Austin party enthusiasts on a mission to make every 
              celebration unforgettable.
            </p>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {teamMembers.map((member) => (
              <div key={member.name} className="group">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="relative h-80 bg-gray-200">
                    {member.image.includes('biff') ? (
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-primary-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl text-dark mb-1">{member.name}</h3>
                    <p className="text-sm font-semibold text-primary-500 mb-3">{member.role}</p>
                    <p className="text-dark/70 text-sm mb-4">{member.bio}</p>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-dark/50">Fun Fact:</p>
                      <p className="text-sm text-primary-500 font-medium">{member.funFact}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Culture Section */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 md:p-12">
            <h3 className="font-display text-2xl text-dark text-center mb-8">Life at Party On</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h4 className="font-semibold text-dark mb-2">Work Hard, Party Smart</h4>
                <p className="text-sm text-dark/70">
                  We take our parties seriously, but never ourselves. Every day is an adventure.
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🤝</div>
                <h4 className="font-semibold text-dark mb-2">Austin Family</h4>
                <p className="text-sm text-dark/70">
                  More than coworkers – we're a tight-knit crew that celebrates each other's wins.
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h4 className="font-semibold text-dark mb-2">Always Innovating</h4>
                <p className="text-sm text-dark/70">
                  From AI party planning to drone delivery (coming soon), we're always pushing boundaries.
                </p>
              </div>
            </div>
          </div>

          {/* Join the Team CTA */}
          <div className="text-center mt-12">
            <h3 className="font-display text-2xl text-dark mb-4">Want to Join the Party?</h3>
            <p className="text-dark/70 mb-6">We're always looking for talented Austin locals who share our passion.</p>
            <a href="/careers" className="btn-primary">
              View Open Positions
            </a>
          </div>
        </div>
      </Section>
    </>
  )
}