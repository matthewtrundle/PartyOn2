import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import BartendingPartnersView from '@/components/admin/BartendingPartnersView';
import type { Prospect } from '@/components/admin/PartnerProspectsView';
import { getOpsSession } from '@/lib/auth/ops-session';
import { listProspects } from '@/lib/partners/prospect-store';

export const metadata: Metadata = {
  title: 'Bartending Prospects — Partners',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Partners hub → Bartending prospect database (partner_prospects table).
 *
 * Server component: a defensive server-side admin check keeps the prospect
 * contact PII from being fetched/serialized for non-admins — the /admin
 * layout gate is client-side only (same pattern as admin/email-signups).
 */
export default async function BartendingProspectsPage(): Promise<ReactElement> {
  const session = await getOpsSession();
  if (!session || session.role !== 'admin') {
    return (
      <div className="p-8">
        <p className="text-gray-700">
          Admin sign-in required.{' '}
          <Link href="/admin" className="text-brand-blue underline">Go to /admin</Link>.
        </p>
      </div>
    );
  }
  const prospects = await listProspects({ vertical: 'bartender' });
  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="bartending-prospects" />
      <div className="px-4 md:px-8 py-8">
        <BartendingPartnersView prospects={prospects as unknown as Prospect[]} />
      </div>
    </div>
  );
}
