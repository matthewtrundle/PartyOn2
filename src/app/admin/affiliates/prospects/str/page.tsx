import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import StrPartnersView from '@/components/admin/StrPartnersView';
import type { Prospect } from '@/components/admin/PartnerProspectsView';
import { listProspects } from '@/lib/partners/prospect-store';

export const metadata: Metadata = {
  title: 'STR Prospects — Partners',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Partners hub → STR prospect database (partner_prospects table). */
export default async function StrProspectsPage(): Promise<ReactElement> {
  const prospects = await listProspects({ vertical: 'str' });
  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="str-prospects" />
      <div className="px-4 md:px-8 py-8">
        <StrPartnersView prospects={prospects as unknown as Prospect[]} />
      </div>
    </div>
  );
}
