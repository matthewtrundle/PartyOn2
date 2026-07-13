/**
 * /concierge-quote/[leadId]
 *
 * Interactive quote page for Premier Concierge leads. The Lead ID
 * doubles as the quote token — UUIDs are opaque enough for
 * pre-launch traffic; upgrade to a signed URL later if pricing goes
 * public.
 *
 * Server component: fetches the Lead + its quote, hydrates the
 * interactive editor with the current state. All customer edits go
 * through PATCH /api/v1/concierge/quote/[leadId] which saves to
 * Lead.metadata.quote.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/database/client';
import ConciergeQuoteClient from '@/components/concierge/ConciergeQuoteClient';
import type { Quote } from '@/lib/concierge/quote';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Concierge Quote | Party On Delivery',
  robots: { index: false, follow: false },
};

async function loadLead(leadId: string) {
  // Basic UUID sanity check so we return 404 for junk paths without
  // hitting Postgres with a malformed WHERE.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
    return null;
  }
  return prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      metadata: true,
    },
  });
}

export default async function ConciergeQuotePage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const lead = await loadLead(leadId);
  if (!lead) return notFound();

  const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
  const isConcierge = meta.partner === 'premier-concierge';
  const quote = meta.quote as Quote | undefined;

  if (!isConcierge || !quote) {
    // Lead exists but was never issued a concierge quote — send them
    // to an explanation page rather than a broken editor.
    return notFound();
  }

  return (
    <ConciergeQuoteClient
      leadId={lead.id}
      customer={{
        firstName: lead.firstName ?? '',
        lastName: lead.lastName ?? '',
        email: lead.email ?? '',
        phone: lead.phone ?? '',
      }}
      initialQuote={quote}
    />
  );
}
