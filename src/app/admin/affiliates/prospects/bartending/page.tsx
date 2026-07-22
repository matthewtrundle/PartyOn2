import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import BartendingPartnersView from '@/components/admin/BartendingPartnersView';
import type { Prospect } from '@/components/admin/PartnerProspectsView';
import { listProspects } from '@/lib/partners/prospect-store';

export const metadata: Metadata = {
  title: 'Bartending Prospects — Partners',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Partners hub → Bartending prospect database (partner_prospects table). */
export default async function BartendingProspectsPage(): Promise<ReactElement> {
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
