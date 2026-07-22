import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import PartnersHubBand from '@/components/admin/partners/PartnersHubBand';
import ProspectsWorkbench from '@/components/admin/prospects/ProspectsWorkbench';
import { getOpsSession } from '@/lib/auth/ops-session';

export const metadata: Metadata = {
  title: 'STR Prospects — Partners',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Partners hub → STR prospect workbench. Data loads client-side from the
 * ops-authed /api/v1/admin/partner-prospects routes; the server-side admin
 * check below is defense in depth (the /admin layout gate is client-only).
 */
export default async function StrProspectsPage(): Promise<ReactElement> {
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
  return (
    <div className="bg-gray-50 min-h-screen">
      <PartnersHubBand active="str-prospects" />
      <div className="px-4 md:px-8 py-8">
        <ProspectsWorkbench vertical="str" />
      </div>
    </div>
  );
}
