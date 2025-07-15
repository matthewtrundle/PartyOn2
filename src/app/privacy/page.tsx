import Hero from '@/components/Hero'
import Section from '@/components/Section'

export default function PrivacyPage() {
  return (
    <>
      <Hero
        title="Privacy Policy"
        subtitle="Your Privacy Matters"
        description="How we collect, use, and protect your information"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none text-dark/80">
            <p className="text-sm text-dark/60 mb-8">Effective Date: January 15, 2025</p>

            <div className="bg-primary-50 rounded-lg p-6 mb-8">
              <h3 className="font-display text-lg text-dark mb-2">Our Commitment</h3>
              <p className="text-dark/70 mb-0">
                Party On Delivery is committed to protecting your privacy. This policy explains how we collect, 
                use, and safeguard your personal information when you use our services.
              </p>
            </div>

            <h2 className="font-display text-2xl text-dark mb-4">1. Information We Collect</h2>
            
            <h3 className="font-semibold text-lg text-dark mb-3">1.1 Information You Provide</h3>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Name and contact information (email, phone number, delivery address)</li>
              <li>Date of birth for age verification</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Event details for party planning services</li>
              <li>Communications with our team</li>
            </ul>

            <h3 className="font-semibold text-lg text-dark mb-3">1.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages viewed, features used, time spent)</li>
              <li>Location data (with your permission for delivery services)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h2 className="font-display text-2xl text-dark mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Process and deliver your orders</li>
              <li>Verify your age as required by law</li>
              <li>Communicate about your orders and events</li>
              <li>Send promotional offers (with your consent)</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
              <li>Prevent fraud and ensure security</li>
            </ul>

            <h2 className="font-display text-2xl text-dark mb-4">3. Information Sharing</h2>
            <p className="mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Service Providers:</strong> Payment processors, delivery partners, and technology providers</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
              <li><strong>With Your Consent:</strong> When you explicitly agree to sharing</li>
            </ul>

            <h2 className="font-display text-2xl text-dark mb-4">4. Data Security</h2>
            <p className="mb-6">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information</li>
              <li>Secure payment processing through PCI-compliant providers</li>
            </ul>

            <h2 className="font-display text-2xl text-dark mb-4">5. Your Rights and Choices</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Update:</strong> Correct inaccurate information</li>
              <li><strong>Delete:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
            </ul>

            <h2 className="font-display text-2xl text-dark mb-4">6. Cookies and Tracking</h2>
            <p className="mb-6">
              We use cookies and similar technologies to enhance your experience. You can manage cookie 
              preferences through your browser settings. Disabling cookies may limit some features of our service.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">7. Third-Party Links</h2>
            <p className="mb-6">
              Our services may contain links to third-party websites. We are not responsible for the privacy 
              practices of these external sites. Please review their privacy policies before providing information.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">8. Children's Privacy</h2>
            <p className="mb-6">
              Our services are not intended for individuals under 21 years of age. We do not knowingly collect 
              information from anyone under 21.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">9. California Privacy Rights</h2>
            <p className="mb-6">
              California residents have additional rights under the California Consumer Privacy Act (CCPA), 
              including the right to know what personal information we collect and the right to request deletion.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">10. Changes to This Policy</h2>
            <p className="mb-6">
              We may update this privacy policy periodically. We will notify you of significant changes by 
              posting a notice on our website or sending you an email.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">11. Contact Us</h2>
            <p className="mb-4">
              For questions about this privacy policy or to exercise your rights, contact us at:
            </p>
            <div className="bg-light rounded-lg p-6">
              <p className="mb-2"><strong>Party On Delivery Privacy Team</strong></p>
              <p className="mb-2">Email: privacy@partyondelivery.com</p>
              <p className="mb-2">Phone: (737) 371-9700</p>
              <p>Mail: Party On Delivery LLC, Austin, TX 78701</p>
            </div>

            <div className="mt-8 p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-dark/60 text-center">
                By using Party On Delivery services, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}