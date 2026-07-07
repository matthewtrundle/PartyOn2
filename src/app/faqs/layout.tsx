import { Metadata } from 'next'
import { generateFAQSchema } from '@/lib/seo/schemas'

const faqData = [
  {
    question: "What areas do you deliver to?",
    answer: "We deliver throughout the greater Austin metropolitan area, including downtown, Lake Travis, Westlake, Cedar Park, Round Rock, and surrounding communities."
  },
  {
    question: "What is your minimum order requirement?",
    answer: "$100 for central Austin, $150 for outer areas including Lake Travis and surrounding communities."
  },
  {
    question: "What is required for age verification?",
    answer: "Valid government-issued photo ID showing you are 21 or older is required. We verify ID upon delivery."
  },
  {
    question: "Are you licensed and insured?",
    answer: "Yes, Party On Delivery is fully licensed by TABC (Texas Alcoholic Beverage Commission) and carries comprehensive liability insurance."
  },
  {
    question: "Do you provide bartending services?",
    answer: "Yes, we offer professional bartending services for weddings and events. TABC-certified bartenders with full bar setup available."
  },
  {
    question: "What are your delivery hours?",
    answer: "We deliver 10AM - 9PM Mon-Sat (closed Sundays). Special arrangements can be made for events with advance notice."
  },
  {
    question: "Can I schedule a recurring delivery?",
    answer: "Yes, we offer recurring delivery services for businesses, offices, and regular events. Contact us for custom arrangements."
  }
]

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Party On Delivery Austin',
  description: 'Common questions about alcohol delivery in Austin. Delivery areas, minimum orders, age verification, licensing, and service details.',
  keywords: 'party on delivery faq, austin alcohol delivery questions, delivery requirements, age verification, tabc licensed',
  alternates: {
    canonical: '/faqs',
  },
  openGraph: {
    title: 'FAQs - Party On Delivery Austin',
    description: 'Everything you need to know about our alcohol delivery service in Austin.',
    url: 'https://partyondelivery.com/faqs',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function FAQsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const faqSchema = generateFAQSchema(faqData)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  )
}