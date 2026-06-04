import type { Metadata } from 'next';
import PlaybookClient from '@/app/landing-page-playbook/PlaybookClient';
import UpsellTrackerView from '@/components/admin/UpsellTrackerView';
import LeadsView from '@/components/admin/LeadsView';
import EventsView from '@/components/admin/EventsView';
import LeadMagnetView from '@/components/admin/LeadMagnetView';
import SeoIntelligenceView from '@/components/admin/SeoIntelligenceView';
import EnrichmentDocsView from '@/components/admin/EnrichmentDocsView';
import BriansStuffTabs from './BriansStuffTabs';

export const metadata: Metadata = {
  title: "Brian's Stuff — Admin",
  robots: { index: false, follow: false },
};

// Force-dynamic so the lead + upsell tracker queries always hit the DB.
export const dynamic = 'force-dynamic';

type SP = Promise<{ tab?: string }>;

/**
 * Admin-only landing page for Brian's reference docs + tools.
 * Tabs:
 *   1. Landing Page Playbook
 *   2. Upsell A/B Tracker
 *   3. Leads — captured form input + visitor sessions
 *   4. Enrichment Docs — IP-based vendor research
 */
export default async function Page({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const initialTab =
    params.tab === 'upsell'
      ? 'upsell'
      : params.tab === 'leads'
        ? 'leads'
        : params.tab === 'events'
          ? 'events'
          : params.tab === 'magnets'
            ? 'magnets'
            : params.tab === 'seo'
              ? 'seo'
              : params.tab === 'docs'
                ? 'docs'
                : 'playbook';

  return (
    <BriansStuffTabs
      initialTab={initialTab}
      playbook={<PlaybookClient />}
      tracker={<UpsellTrackerView />}
      leads={<LeadsView />}
      events={<EventsView />}
      magnets={<LeadMagnetView />}
      seo={<SeoIntelligenceView />}
      docs={<EnrichmentDocsView />}
    />
  );
}
