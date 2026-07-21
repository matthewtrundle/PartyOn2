import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import StrPartnersView from '@/components/admin/StrPartnersView';

export const metadata: Metadata = {
  title: 'STR Prospects — Partners',
  robots: { index: false, follow: false },
};

/** Partners hub → STR prospect database (moved from Brian's Stuff). */
export default function StrProspectsPage(): ReactElement {
  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="str-prospects" />
      <div className="px-4 md:px-8 py-8">
        <StrPartnersView />
      </div>
    </div>
  );
}
