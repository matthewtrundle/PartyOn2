import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: 'Terms of Service | Party On Delivery',
  description: 'Terms of Service for Party On Delivery - Austin\'s premium alcohol delivery service. Review our policies on age verification, delivery, cancellations, and responsible service.',
  alternates: {
    canonical: 'https://partyondelivery.com/terms',
  },
  openGraph: {
    title: 'Terms of Service | Party On Delivery',
    description: 'Terms of Service for Party On Delivery - Austin\'s premium alcohol delivery service.',
    url: 'https://partyondelivery.com/terms',
    siteName: 'Party On Delivery',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <div className="bg-white min-h-screen">
      <Navigation forceScrolled={true} />
      
      {/* Header */}
      <section className="pt-32 pb-16 px-8 bg-gray-50">
        <div className="hero-fade-in max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-5xl text-gray-900 mb-4 tracking-[0.1em]">
            Terms of Service
          </h1>
          <p className="text-gray-600">Last updated: June 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <div className="space-y-8">
            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">1. Service Agreement</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                By placing an order with Party On Delivery (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. Our services are available only to individuals who are 21 years of age or older.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">2. Age Verification</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                All customers must provide valid government-issued identification proving they are 21 years or older. We reserve the right to refuse service to anyone who cannot provide adequate age verification. Our delivery personnel will verify ID upon delivery.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">3. Order Requirements</h2>
              <ul className="text-gray-600 space-y-2 list-disc pl-6">
                <li>Minimum order value: $100-150 depending on delivery area</li>
                <li>All orders require 72-hour advance notice</li>
                <li>Orders must be placed by an individual 21 years or older</li>
                <li>Delivery address must be within our service area</li>
                <li>Someone 21+ must be present to receive delivery</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">4. Delivery Policy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We deliver to the greater Austin metropolitan area. Delivery times are estimates and not guaranteed. We are not responsible for delays due to weather, traffic, or other circumstances beyond our control. Delivery fees vary by location and order size.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">5. Cancellation & Refunds</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Orders may be cancelled up to 48 hours before the scheduled delivery time for a full refund. Cancellations within 48 hours may be subject to a cancellation fee. We reserve the right to cancel any order that does not meet our requirements.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">6. Responsible Service</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We will not deliver to visibly intoxicated persons. We reserve the right to refuse service to anyone. Customers assume all responsibility for the lawful and responsible consumption of alcohol products.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">7. Liability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Party On Delivery is fully licensed and insured. However, we are not responsible for any damages, injuries, or legal issues arising from the consumption of alcohol products after delivery. Customers assume all risks associated with alcohol consumption.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">8. Privacy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Your privacy is important to us. Please review our <Link href="/privacy" className="text-brand-yellow hover:text-yellow-600">Privacy Policy</Link> to understand how we collect, use, and protect your information.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">9. Text Messaging (SMS)</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you provide your mobile number, you consent to receive text messages from Party On Delivery related to your orders and customer service, including order confirmations, delivery status and scheduling updates, group order coordination links, review requests, reminders to complete an unfinished order, and replies to your questions. Consent is not a condition of purchase.
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6 mb-4">
                <li>Message frequency varies based on your order activity.</li>
                <li>Message and data rates may apply.</li>
                <li>Reply STOP at any time to unsubscribe; reply HELP for assistance.</li>
                <li>Carriers are not liable for delayed or undelivered messages.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not share mobile information with third parties or affiliates for marketing or promotional purposes. See our <Link href="/privacy" className="text-brand-yellow hover:text-yellow-600">Privacy Policy</Link> for details on how we handle your information.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">10. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services constitutes acceptance of any changes.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">11. Contact Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="text-gray-600 leading-relaxed">
                <p>Party On Delivery</p>
                <p>Austin, TX</p>
                <p>Phone: (737) 371-9700</p>
                <p>Email: info@partyondelivery.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img 
                src="/images/pod-logo-2025.svg" 
                alt="Party On Delivery"
                className="h-16 w-auto mb-4"
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Austin&apos;s premier alcohol delivery and event service since 2020.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Weddings</Link></li>
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/austin-bachelor-party-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Celebrations</Link></li>
                <li><Link href="/austin-corporate-event-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corporate</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">INFORMATION</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">About Us</Link></li>
                <li><Link href="/faqs" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">FAQs</Link></li>
                <li><Link href="/terms" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Hours: 10AM - 9PM (except Sundays)</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2024 Party On Delivery. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}