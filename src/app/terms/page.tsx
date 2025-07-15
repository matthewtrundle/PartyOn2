import Hero from '@/components/Hero'
import Section from '@/components/Section'

export default function TermsPage() {
  return (
    <>
      <Hero
        title="Terms & Conditions"
        subtitle="Legal Information"
        description="Please read these terms carefully before using our services"
        backgroundImage="/images/hero/austin-skyline-hero.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none text-dark/80">
            <p className="text-sm text-dark/60 mb-8">Last updated: January 15, 2025</p>

            <h2 className="font-display text-2xl text-dark mb-4">1. Acceptance of Terms</h2>
            <p className="mb-6">
              By accessing or using Party On Delivery services, you agree to be bound by these Terms & Conditions 
              and all applicable laws and regulations. If you do not agree with any part of these terms, you may 
              not use our services.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">2. Age Requirements</h2>
            <p className="mb-6">
              You must be 21 years of age or older to use our services. We reserve the right to verify age at 
              any time and will refuse service to anyone unable to provide valid identification. By using our 
              services, you represent and warrant that you are at least 21 years old.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">3. Service Description</h2>
            <p className="mb-6">
              Party On Delivery provides alcohol delivery and bartending services in accordance with Texas state 
              law and TABC regulations. Our services include:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Alcohol delivery to permitted locations</li>
              <li>Professional bartending services for events</li>
              <li>Event planning consultation</li>
              <li>Bar equipment and supply rental</li>
            </ul>

            <h2 className="font-display text-2xl text-dark mb-4">4. Ordering and Delivery</h2>
            <p className="mb-4">
              <strong>4.1 Order Placement:</strong> Orders can be placed through our website, mobile app, or phone. 
              All orders are subject to availability and our delivery area restrictions.
            </p>
            <p className="mb-4">
              <strong>4.2 Delivery Requirements:</strong> Someone 21 or older with valid ID must be present to 
              receive delivery. We cannot leave alcohol unattended.
            </p>
            <p className="mb-6">
              <strong>4.3 Refusal of Service:</strong> We reserve the right to refuse service to anyone who appears 
              intoxicated or cannot provide valid identification.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">5. Pricing and Payment</h2>
            <p className="mb-4">
              <strong>5.1 Pricing:</strong> All prices are listed in USD and include applicable taxes. Delivery 
              fees are calculated based on distance and order size.
            </p>
            <p className="mb-4">
              <strong>5.2 Payment Methods:</strong> We accept major credit cards, debit cards, and approved digital 
              payment methods. Payment is due at time of order.
            </p>
            <p className="mb-6">
              <strong>5.3 Gratuity:</strong> Gratuity is not included in pricing but is appreciated for our delivery 
              drivers and bartenders.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">6. Cancellations and Refunds</h2>
            <p className="mb-4">
              <strong>6.1 Delivery Orders:</strong> May be cancelled before dispatch for full refund. Once dispatched, 
              orders cannot be cancelled.
            </p>
            <p className="mb-6">
              <strong>6.2 Event Services:</strong> Cancellations must be made at least 48 hours before the event for 
              full refund. Cancellations within 48 hours may incur fees.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">7. Liability and Indemnification</h2>
            <p className="mb-6">
              Party On Delivery is not liable for any damages resulting from the consumption of alcohol. Customers 
              agree to indemnify and hold harmless Party On Delivery from any claims arising from their use of 
              our services.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">8. Privacy Policy</h2>
            <p className="mb-6">
              Your use of our services is also governed by our Privacy Policy. Please review our Privacy Policy 
              to understand our practices regarding your personal information.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">9. Modifications to Terms</h2>
            <p className="mb-6">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon 
              posting to our website. Your continued use of our services constitutes acceptance of modified terms.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">10. Governing Law</h2>
            <p className="mb-6">
              These terms are governed by the laws of the State of Texas. Any disputes shall be resolved in the 
              courts of Travis County, Texas.
            </p>

            <h2 className="font-display text-2xl text-dark mb-4">11. Contact Information</h2>
            <p className="mb-6">
              For questions about these Terms & Conditions, please contact us at:
            </p>
            <div className="bg-light rounded-lg p-6">
              <p className="mb-2"><strong>Party On Delivery LLC</strong></p>
              <p className="mb-2">Austin, TX 78701</p>
              <p className="mb-2">Email: legal@partyondelivery.com</p>
              <p>Phone: (737) 371-9700</p>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}