'use client'

import Hero from '@/components/Hero'
import Section from '@/components/Section'
import { useState } from 'react'

const faqCategories = [
  {
    category: "Ordering & Delivery",
    faqs: [
      {
        question: "How fast can you deliver?",
        answer: "Our average delivery time is 27 minutes within Austin city limits. For Lake Travis and surrounding areas, delivery typically takes 35-45 minutes. Event packages require advance booking."
      },
      {
        question: "What are your delivery hours?",
        answer: "We deliver 7 days a week from 10am to 2am. For special events and weddings, we accommodate any schedule with advance notice."
      },
      {
        question: "Is there a minimum order?",
        answer: "Yes, we have a $50 minimum for standard delivery and $250 minimum for event packages. Delivery fees vary by location."
      },
      {
        question: "Do you deliver to boats on Lake Travis?",
        answer: "Absolutely! We&apos;re Lake Travis&apos;s premier boat delivery service. We deliver to all major marinas and can coordinate with your boat rental company."
      }
    ]
  },
  {
    category: "Events & Packages",
    faqs: [
      {
        question: "What&apos;s included in event packages?",
        answer: "Our event packages include premium spirits, mixers, garnishes, bar tools, ice, cups, and napkins. Full-service packages add professional bartenders and custom bar setup."
      },
      {
        question: "How far in advance should I book?",
        answer: "For weddings and large events, we recommend booking 2-4 weeks in advance. For smaller gatherings and boat parties, 48 hours notice is usually sufficient."
      },
      {
        question: "Do you provide bartenders?",
        answer: "Yes! All our bartenders are TABC certified professionals with extensive experience at Austin&apos;s finest venues. They&apos;re included in our full-service packages."
      },
      {
        question: "Can you create custom cocktail menus?",
        answer: "Absolutely! Our mixologists love creating signature cocktails for events. We'll work with you to design drinks that match your theme and preferences."
      }
    ]
  },
  {
    category: "Legal & Safety",
    faqs: [
      {
        question: "Are you licensed and insured?",
        answer: "Yes, we&apos;re fully licensed by TABC (Texas Alcoholic Beverage Commission) and carry comprehensive liability insurance for all services."
      },
      {
        question: "Do you check IDs?",
        answer: "Always. We verify age for every delivery and event. All guests must be 21+ with valid ID. No exceptions."
      },
      {
        question: "What&apos;s your policy on intoxicated guests?",
        answer: "Safety first. Our team is trained in responsible service. We reserve the right to refuse service to intoxicated individuals and will work with hosts to ensure everyone's safety."
      }
    ]
  },
  {
    category: "Pricing & Payment",
    faqs: [
      {
        question: "How is pricing calculated?",
        answer: "Pricing includes product cost plus delivery fee (based on distance) and service fee. Event packages are custom quoted based on guest count, duration, and service level."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards, Apple Pay, Google Pay, and Venmo for business. Corporate accounts can be invoiced with NET 30 terms."
      },
      {
        question: "Is gratuity included?",
        answer: "Gratuity is not included but always appreciated. For events with bartenders, we suggest 15-20% gratuity."
      },
      {
        question: "Do you offer corporate accounts?",
        answer: "Yes! We work with many Austin businesses for regular orders and corporate events. Contact us for special pricing and terms."
      }
    ]
  }
]

export default function FAQsPage() {
  const [openCategory, setOpenCategory] = useState<string | null>("Ordering & Delivery")
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  return (
    <>
      <Hero
        title="Frequently Asked Questions"
        subtitle="Everything You Need to Know"
        description="Get answers to common questions about Party On Delivery"
        backgroundImage="/images/hero/austin-skyline-golden-hour.webp"
        height="medium"
      />

      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl text-dark mb-4">
              How Can We Help?
            </h2>
            <p className="text-lg text-dark/70">
              Can't find what you&apos;re looking for? Call us at (737) 371-9700
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((cat) => (
              <div key={cat.category} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-light transition-colors"
                >
                  <h3 className="font-display text-xl text-dark">{cat.category}</h3>
                  <svg
                    className={`w-5 h-5 text-dark/60 transition-transform ${
                      openCategory === cat.category ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openCategory === cat.category && (
                  <div className="px-6 py-4 space-y-4">
                    {cat.faqs.map((faq, index) => (
                      <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <button
                          onClick={() => setOpenQuestion(openQuestion === faq.question ? null : faq.question)}
                          className="w-full text-left flex items-start justify-between py-2 hover:text-primary-500 transition-colors"
                        >
                          <span className="font-medium text-dark pr-4">{faq.question}</span>
                          <svg
                            className={`w-4 h-4 text-dark/40 flex-shrink-0 mt-1 transition-transform ${
                              openQuestion === faq.question ? 'rotate-45' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        {openQuestion === faq.question && (
                          <p className="text-dark/70 mt-2 pl-0">{faq.answer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Still have questions? */}
          <div className="mt-12 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-8 text-center">
            <h3 className="font-display text-2xl text-dark mb-4">Still Have Questions?</h3>
            <p className="text-dark/70 mb-6">
              Our team is here to help with any questions about your upcoming celebration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/contact" className="btn-primary">
                Contact Us
              </a>
              <a href="tel:7373719700" className="btn-outline">
                Call (737) 371-9700
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}