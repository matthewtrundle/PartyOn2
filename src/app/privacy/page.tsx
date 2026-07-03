import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: 'Privacy Policy | Party On Delivery',
  description: 'Privacy Policy for Party On Delivery - Learn how we collect, use, and protect your personal information for our Austin alcohol delivery service.',
  alternates: {
    canonical: 'https://partyondelivery.com/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | Party On Delivery',
    description: 'Privacy Policy for Party On Delivery - Learn how we collect, use, and protect your personal information.',
    url: 'https://partyondelivery.com/privacy',
    siteName: 'Party On Delivery',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen">
      <Navigation forceScrolled={true} />
      
      {/* Header */}
      <section className="pt-32 pb-16 px-8 bg-gray-50">
        <div className="hero-fade-in max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-5xl text-gray-900 mb-4 tracking-[0.1em]">
            Privacy Policy
          </h1>
          <p className="text-gray-600">Last updated: June 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <div className="space-y-8">
            <div>
              <p className="text-gray-600 leading-relaxed mb-8">
                Party On Delivery (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Information We Collect</h2>
              <h3 className="font-heading text-xl text-gray-800 mb-3">Personal Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6 mb-6">
                <li>Name and contact information</li>
                <li>Date of birth for age verification</li>
                <li>Delivery address</li>
                <li>Payment information</li>
                <li>Order history and preferences</li>
                <li>Communications with us</li>
              </ul>

              <h3 className="font-heading text-xl text-gray-800 mb-3">Automatically Collected Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you use our website, we may automatically collect:
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6">
                <li>Device and browser information</li>
                <li>IP address and location data</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">How We Use Your Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6">
                <li>Process and fulfill your orders</li>
                <li>Verify your age and identity</li>
                <li>Communicate with you about your orders</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
                <li>Protect against fraud and unauthorized activity</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Text Messaging (SMS)</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you provide your mobile number &mdash; for example, during checkout after completing age verification &mdash; you consent to receive text messages from Party On Delivery related to your orders and customer service, including order confirmations, delivery status and scheduling updates, group order coordination links, review requests, reminders to complete an unfinished order, and replies to your questions. Consent to receive these texts is not a condition of any purchase.
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6 mb-4">
                <li>Message frequency varies based on your order activity.</li>
                <li>Message and data rates may apply.</li>
                <li>Reply STOP to any message to unsubscribe, or HELP for help.</li>
                <li>For assistance, contact us at info@partyondelivery.com or (737) 371-9700.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Information Sharing</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information. We may share your information with:
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6">
                <li>Service providers who assist in our operations</li>
                <li>Payment processors for transaction processing</li>
                <li>Law enforcement when required by law</li>
                <li>Third parties with your explicit consent</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Your Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="text-gray-600 space-y-2 list-disc pl-6">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Restrict processing of your information</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Cookies</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookies through your browser settings, but disabling cookies may limit your ability to use certain features of our service.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Children&apos;s Privacy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our services are not intended for individuals under 21 years of age. We do not knowingly collect personal information from anyone under 21. If we learn we have collected information from someone under 21, we will delete that information.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">Contact Us</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
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