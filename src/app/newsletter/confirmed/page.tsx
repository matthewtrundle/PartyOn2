import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Newsletter Subscription | Party On Delivery',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const COPY: Record<string, { title: string; body: string }> = {
  ok: {
    title: "You're In",
    body: 'Your subscription is confirmed. Keep an eye on your inbox for exclusive deals and party-planning tips.',
  },
  invalid: {
    title: 'Link Expired',
    body: 'This confirmation link is invalid or has already been used. Try subscribing again from the bottom of any page.',
  },
  error: {
    title: 'Something Went Wrong',
    body: "We couldn't confirm your subscription just now. Please try again in a moment.",
  },
}

export default async function NewsletterConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'ok' } = await searchParams
  const { title, body } = COPY[status] ?? COPY.ok

  return (
    <main className="pt-32 pb-16 px-8 min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-4">
          {title}
        </h1>
        <p className="text-gray-700 mb-8">{body}</p>
        <Link href="/" className="btn-primary inline-block">
          Back to Home
        </Link>
      </div>
    </main>
  )
}
