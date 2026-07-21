import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import BartendingPartnersView from '@/components/admin/BartendingPartnersView';

export const metadata: Metadata = {
  title: 'Bartending Prospects — Partners',
  robots: { index: false, follow: false },
};

/** Partners hub → Bartending prospect database (moved from Brian's Stuff). */
export default function BartendingProspectsPage(): ReactElement {
  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="bartending-prospects" />
      <div className="px-4 md:px-8 py-8">
        <BartendingPartnersView />
      </div>
    </div>
  );
}
