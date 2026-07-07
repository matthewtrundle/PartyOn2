'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import ScrollRevealCSS from '@/components/ui/ScrollRevealCSS';
import Navigation from "@/components/Navigation";
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { generateFAQSchema } from '@/lib/seo/schemas';

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: "Ordering & Delivery",
      questions: [
        {
          q: "What areas do you deliver to?",
          a: "We deliver throughout the greater Austin metropolitan area, including downtown, Lake Travis, Westlake, Cedar Park, Round Rock, and surrounding communities. Check our delivery areas page for specific zip codes."
        },
        {
          q: "What is your minimum order requirement?",
          a: "Minimum orders depend on your delivery zone: $100 for central Austin, $125 for greater Austin, and $150 for extended areas like Cedar Park and Georgetown. Enter your zip at checkout to see your exact minimum — and orders over $250, $300, or $400 (by zone) get free standard delivery."
        },
        {
          q: "What are your delivery hours?",
          a: "We deliver 10AM - 9PM Mon-Sat (closed Sundays). Special arrangements can be made for early morning or late-night events with advance notice."
        }
      ]
    },
    {
      category: "Age Verification & Legal",
      questions: [
        {
          q: "What is required for age verification?",
          a: "Valid government-issued photo ID showing you are 21 or older is required. Acceptable forms include driver's license, passport, or military ID. We verify ID upon delivery."
        },
        {
          q: "Can someone else receive my delivery?",
          a: "Yes, but they must be 21 or older with valid ID. The receiving person assumes responsibility for the order. We cannot leave alcohol unattended."
        },
        {
          q: "Are you licensed and insured?",
          a: "Yes, Party On Delivery is fully licensed by TABC (Texas Alcoholic Beverage Commission) and carries comprehensive liability insurance for all deliveries and events."
        }
      ]
    },
    {
      category: "Events & Services",
      questions: [
        {
          q: "Do you provide bartending services?",
          a: "Yes, we offer professional bartending services for weddings, corporate events, and private parties. All bartenders are TABC certified and insured."
        },
        {
          q: "Can you create custom cocktail menus?",
          a: "Absolutely! Our mixologists can design signature cocktails for your event, including themed drinks, seasonal specialties, and mocktails for non-drinking guests."
        },
        {
          q: "Do you provide glassware and bar equipment?",
          a: "Yes, we offer complete bar setups including premium glassware, ice, garnishes, mixers, and professional bar tools. Equipment rental is available separately or as part of our full-service packages."
        },
        {
          q: "What happens if I need to cancel my event?",
          a: "Cancellations made 48+ hours before your event receive a full refund. Cancellations within 48 hours may be subject to a cancellation fee. We understand plans change and work with you when possible."
        }
      ]
    },
    {
      category: "Products & Pricing",
      questions: [
        {
          q: "How is pricing determined?",
          a: "Pricing includes the cost of products plus delivery and service fees. Event packages are customized based on guest count, service level, and duration. We provide transparent quotes with no hidden fees."
        },
        {
          q: "Do you offer non-alcoholic options?",
          a: "Yes, we provide a full range of non-alcoholic beverages including craft sodas, fresh juices, mocktail ingredients, and premium water options."
        },
        {
          q: "Can I return or exchange products?",
          a: "Due to alcohol regulations, we cannot accept returns of delivered products. If there's an issue with your order, contact us immediately and we'll make it right."
        }
      ]
    },
    {
      category: "Payment & Account",
      questions: [
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit and debit cards, and corporate clients can pay invoices by corporate card, ACH, or wire. Payment is processed securely through our encrypted checkout system."
        },
        {
          q: "Do you offer corporate accounts?",
          a: "Yes, we work with companies all the time — itemized quotes and invoices your finance team can approve before anything is locked, payable by corporate card, ACH, or wire, with dedicated support for businesses that order regularly."
        },
        {
          q: "Is gratuity included?",
          a: "Delivery fees do not include gratuity. Tips for delivery drivers and bartenders are appreciated but not required. Suggested gratuity is 15-20% for exceptional service."
        }
      ]
    }
  ];

  // Flatten FAQ structure for schema
  const allFAQs = faqs.flatMap(category =>
    category.questions.map(q => ({
      question: q.q,
      answer: q.a
    }))
  );

  const faqSchema = generateFAQSchema(allFAQs);

  return (
    <div className="bg-white min-h-screen">
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navigation forceScrolled={true} />
      
      {/* Header */}
      <section className="pt-32 pb-16 px-8 bg-gray-50">
        <div className="hero-fade-in max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-5xl text-gray-900 mb-4 tracking-[0.1em]">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 text-lg">Everything you need to know about our services</p>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          {faqs.map((category, categoryIndex) => (
            <ScrollRevealCSS
              key={categoryIndex}
              delay={categoryIndex * 100}
              duration={600}
              className="mb-12"
            >
              <h2 className="font-heading text-2xl text-gray-900 mb-6 tracking-[0.1em]">
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, index) => {
                  const globalIndex = categoryIndex * 100 + index;
                  const isOpen = openIndex === globalIndex;
                  
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 hover:border-brand-yellow transition-colors"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left"
                      >
                        <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                        <ChevronDownIcon 
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            isOpen ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div
                          className="overflow-hidden accordion-expand"
                        >
                          <p className="px-6 pb-4 text-gray-600 leading-relaxed">
                            {faq.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollRevealCSS>
          ))}

          {/* Contact CTA */}
          <ScrollRevealCSS
            delay={500}
            duration={600}
            className="mt-16 p-8 bg-gray-50 text-center"
          >
            <h3 className="font-heading text-2xl text-gray-900 mb-4 tracking-[0.1em]">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our team is here to help with any questions about our services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <button className="px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.08em] text-sm">
                  CONTACT US
                </button>
              </Link>
              <a href="tel:7373719700">
                <button className="px-8 py-3 border border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-colors tracking-[0.08em] text-sm">
                  CALL (737) 371-9700
                </button>
              </a>
            </div>
          </ScrollRevealCSS>
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
                <li>Hours: 10AM - 9PM Mon-Sat (closed Sundays)</li>
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