import type { Metadata } from 'next';
import PlaybookClient from '@/app/landing-page-playbook/PlaybookClient';
import UpsellTrackerView from '@/components/admin/UpsellTrackerView';
import LeadsView from '@/components/admin/LeadsView';
import EventsView from '@/components/admin/EventsView';
import LeadMagnetView from '@/components/admin/LeadMagnetView';
import ExperimentsView from '@/components/admin/ExperimentsView';
import SeoIntelligenceView from '@/components/admin/SeoIntelligenceView';
import OrderPathwaysView from '@/components/admin/OrderPathwaysView';
import RecommendationLogicView from '@/components/admin/RecommendationLogicView';
import EnrichmentDocsView from '@/components/admin/EnrichmentDocsView';
import StrPartnersView from '@/components/admin/StrPartnersView';
import BartendingPartnersView from '@/components/admin/BartendingPartnersView';
import BriansStuffTabs from './BriansStuffTabs';

export const metadata: Metadata = {
  title: "Brian's Stuff — Admin",
  robots: { index: false, follow: false },
};

// Force-dynamic so the lead + upsell tracker queries always hit the DB.
export const dynamic = 'force-dynamic';

type SP = Promise<{ tab?: string; lead?: string }>;

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
  const VALID_TABS = [
    'playbook',
    'experiments',
    'upsell',
    'leads',
    'events',
    'magnets',
    'seo',
    'pathways',
    'logic',
    'docs',
    'str',
    'bartenders',
  ] as const;
  const initialTab = (
    (VALID_TABS as readonly string[]).includes(params.tab ?? '')
      ? (params.tab as (typeof VALID_TABS)[number])
      : 'playbook'
  );

  return (
    <BriansStuffTabs
      initialTab={initialTab}
      playbook={<PlaybookClient />}
      experiments={<ExperimentsView />}
      tracker={<UpsellTrackerView />}
      leads={<LeadsView deepLinkedLeadId={params.lead ?? null} />}
      events={<EventsView />}
      magnets={<LeadMagnetView />}
      seo={<SeoIntelligenceView />}
      pathways={<OrderPathwaysView />}
      logic={<RecommendationLogicView />}
      docs={<EnrichmentDocsView />}
      str={<StrPartnersView />}
      bartenders={<BartendingPartnersView />}
    />
  );
}
