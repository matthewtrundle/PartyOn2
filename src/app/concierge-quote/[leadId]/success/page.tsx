/**
 * /concierge-quote/[leadId]/success
 *
 * Post-Stripe-checkout landing page. Verifies the session_id query
 * param against Stripe SERVER-SIDE and, if paid, promotes the quote's
 * status to `deposit-paid` on Lead.metadata.quote. We never trust the
 * URL alone to unlock anything.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/database/client';
import { stripe } from '@/lib/stripe/client';
import { computeQuoteTotals, type Quote } from '@/lib/concierge/quote';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Deposit paid — Premier Concierge | Party On Delivery',
  robots: { index: false, follow: false },
};

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const RASPBERRY = '#7A1E4A';
const ROSE = '#E8B4CE';
const CREAM = '#FAF6EE';

function isValidLeadId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function fmt$(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default async function ConciergeDepositSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { leadId } = await params;
  const { session_id: sessionId } = await searchParams;
  if (!isValidLeadId(leadId)) return notFound();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { firstName: true, metadata: true },
  });
  if (!lead) return notFound();

  const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
  const quote = meta.quote as Quote | undefined;
  if (!quote) return notFound();

  const theme = quote.variant === 'bachelorette'
    ? { primary: RASPBERRY, accent: ROSE, onAccent: '#3F0F27', soft: '#FFF4F8' }
    : { primary: NAVY, accent: GOLD, onAccent: NAVY, soft: CREAM };

  const totals = computeQuoteTotals(quote);

  // ─── Verify with Stripe ──────────────────────────────────────
  // Two ways to end up here:
  //   1. Fresh redirect from Stripe with a session_id in the URL — verify it.
  //   2. Direct hit after we already marked it paid — trust the flag.
  let verified = quote.status === 'deposit-paid';
  let verifiedError: string | null = null;

  if (!verified && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const matchesLead = session.metadata?.leadId === leadId;
      const paid =
        session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
      if (matchesLead && paid) {
        verified = true;
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            status: 'CONVERTED',
            metadata: {
              ...meta,
              quote: {
                ...quote,
                status: 'deposit-paid',
                depositPaidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            } as never,
          },
        });
      } else if (!matchesLead) {
        verifiedError = 'session_lead_mismatch';
      } else {
        verifiedError = 'not_paid_yet';
      }
    } catch (err) {
      console.error('[concierge success] Stripe retrieve failed', err);
      verifiedError = 'stripe_verify_failed';
    }
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: theme.soft, color: theme.primary }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 text-center">
        {verified ? (
          <>
            <div
              className="inline-block px-4 py-2 rounded-full text-xs font-bold tracking-widest mb-6"
              style={{ background: theme.primary, color: theme.accent }}
            >
              ✓ DEPOSIT CONFIRMED
            </div>
            <h1
              className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-tight"
              style={{ color: theme.primary }}
            >
              You&rsquo;re booked.
            </h1>
            <p className="mt-4 text-base text-gray-700 max-w-xl mx-auto">
              {lead.firstName || 'Your concierge'} — thanks for locking in
              your weekend. Your dedicated concierge will confirm every
              vendor within 24 hours and send you the final itinerary.
            </p>

            <div
              className="mt-8 mx-auto max-w-md rounded-lg p-5 text-left"
              style={{
                background: '#FFFFFF',
                border: `2px solid ${theme.primary}`,
              }}
            >
              <div
                className="text-[10px] font-bold tracking-widest mb-3"
                style={{ color: theme.primary }}
              >
                RECEIPT
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal</span>
                <span className="font-mono">{fmt$(totals.subtotal)}</span>
              </div>
              <div
                className="flex justify-between text-sm font-bold mt-2 pt-2"
                style={{ borderTop: `1px solid #E5E7EB` }}
              >
                <span>Deposit paid today</span>
                <span className="font-mono" style={{ color: '#0F8141' }}>
                  {fmt$(totals.depositAmount)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Remaining (due 7d before)</span>
                <span className="font-mono">{fmt$(totals.remaining)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Stripe emailed you a receipt. Save this page — your quote link
              stays live until the event.
            </p>

            <div className="mt-8">
              <Link
                href={`/concierge-quote/${leadId}`}
                className="inline-block rounded-lg px-6 py-3 text-sm font-heading font-bold tracking-[0.10em] transition-transform hover:scale-[1.03]"
                style={{
                  background: theme.accent,
                  color: theme.onAccent,
                  border: `2px solid ${theme.primary}`,
                  boxShadow: `0 3px 0 ${theme.primary}`,
                }}
              >
                VIEW YOUR QUOTE
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1
              className="font-heading text-3xl md:text-4xl font-bold tracking-tight leading-tight"
              style={{ color: theme.primary }}
            >
              We couldn&rsquo;t verify your deposit.
            </h1>
            <p className="mt-4 text-base text-gray-700 max-w-xl mx-auto">
              {verifiedError === 'not_paid_yet'
                ? "Stripe hasn't marked the payment as complete yet. Give it a minute and refresh — or hit the button below to try again."
                : "Something went sideways verifying your session. This doesn't mean the deposit failed — hit the button below to reopen your quote, or reply to your quote email and a concierge will confirm manually."}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/concierge-quote/${leadId}`}
                className="rounded-lg px-6 py-3 text-sm font-heading font-bold tracking-[0.10em] transition-transform hover:scale-[1.03]"
                style={{
                  background: theme.accent,
                  color: theme.onAccent,
                  border: `2px solid ${theme.primary}`,
                  boxShadow: `0 3px 0 ${theme.primary}`,
                }}
              >
                BACK TO QUOTE
              </Link>
              <a
                href="tel:+17373719700"
                className="text-sm font-bold underline"
                style={{ color: theme.primary }}
              >
                Or call (737) 371-9700
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
