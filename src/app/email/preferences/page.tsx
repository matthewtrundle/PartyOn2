/**
 * /email/preferences — public email preference page linked from the
 * CAN-SPAM footer of every follow-up email. Token-verified (HMAC minted with
 * the email); shows current status and a one-button unsubscribe/resubscribe.
 * Bounce/complaint suppressions are shown but NOT publicly reversible.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { prisma } from '@/lib/database/client';
import {
  normalizeEmail,
  verifyUnsubscribeToken,
} from '@/lib/followups/suppression';

export const metadata: Metadata = {
  title: 'Email Preferences | Party On Delivery',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string; done?: string }>;
}

function InvalidLink(): ReactElement {
  return (
    <main className="pt-32 pb-16 px-8 min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-4">
          Link Not Valid
        </h1>
        <p className="text-gray-700 mb-8">
          This preferences link is invalid or incomplete. Use the unsubscribe
          link from the bottom of any email we sent you, or contact us at
          info@partyondelivery.com and we&apos;ll sort it out.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Back to Home
        </Link>
      </div>
    </main>
  );
}

export default async function EmailPreferencesPage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const { email: rawEmail, token, done } = await searchParams;
  if (!rawEmail || !token) return <InvalidLink />;

  const email = normalizeEmail(rawEmail);
  if (!verifyUnsubscribeToken(email, token)) return <InvalidLink />;

  const suppression = await prisma.emailSuppression.findUnique({
    where: { email },
  });
  const isHardSuppressed =
    suppression !== null &&
    (suppression.reason === 'bounce' || suppression.reason === 'complaint');
  const isUnsubscribed = suppression !== null;

  const formAction = `/api/email/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const banner =
    done === 'unsubscribed'
      ? { text: "You're unsubscribed. We won't send you any more follow-up emails.", tone: 'ok' as const }
      : done === 'resubscribed'
        ? { text: "You're back on the list.", tone: 'ok' as const }
        : done === 'blocked'
          ? { text: 'This address had delivery problems, so we can\'t re-enable it here — email us and we\'ll fix it.', tone: 'warn' as const }
          : null;

  return (
    <main className="pt-32 pb-16 px-8 min-h-[60vh]">
      <div className="max-w-lg mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-gray-900 mb-2 text-center">
          Email Preferences
        </h1>
        <p className="text-gray-700 text-center mb-8">{email}</p>

        {banner && (
          <div
            className={`rounded-lg border p-4 mb-6 text-sm ${
              banner.tone === 'ok'
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {banner.text}
          </div>
        )}

        <div className="card">
          {isHardSuppressed ? (
            <>
              <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-2">
                Delivery Problems on This Address
              </h2>
              <p className="text-gray-700 text-sm mb-4">
                A previous email to this address bounced or was reported as
                spam, so we&apos;ve stopped sending to it. If that was a
                mistake, email us at info@partyondelivery.com and we&apos;ll
                re-enable it manually.
              </p>
            </>
          ) : isUnsubscribed ? (
            <>
              <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-2">
                You&apos;re Unsubscribed
              </h2>
              <p className="text-gray-700 text-sm mb-6">
                We won&apos;t send follow-up or marketing email to this
                address. Order receipts and invoices still arrive — those are
                transactional.
              </p>
              <form method="POST" action={formAction}>
                <input type="hidden" name="action" value="resubscribe" />
                <input type="hidden" name="redirect" value="1" />
                <button type="submit" className="btn-primary w-full">
                  Resubscribe
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold tracking-[0.08em] text-gray-900 mb-2">
                You&apos;re Subscribed
              </h2>
              <p className="text-gray-700 text-sm mb-6">
                We occasionally follow up on quotes, orders, and questions you
                send us — always from a real person, never a blast. Unsubscribe
                below and we&apos;ll stop; order receipts and invoices still
                arrive.
              </p>
              <form method="POST" action={formAction}>
                <input type="hidden" name="action" value="unsubscribe" />
                <input type="hidden" name="redirect" value="1" />
                <button type="submit" className="btn-secondary w-full">
                  Unsubscribe
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          Questions? Email{' '}
          <a href="mailto:info@partyondelivery.com" className="text-brand-blue underline">
            info@partyondelivery.com
          </a>
        </p>
      </div>
    </main>
  );
}
