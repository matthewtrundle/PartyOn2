'use client';

/**
 * Prospects workbench orchestrator — one per vertical page. Fetches the
 * prospect list (partner_prospects), the campaign map (GET sync), the
 * metrics, A/B results, and the campaign-funnel overview; derives pipeline
 * chips; owns selection, search, status filter, the drawer, and the
 * campaign panel's cross-vertical drill (?prospect= deep link).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import ProspectsFilterBar from './ProspectsFilterBar';
import ProspectsMetricsStrip, { type ProspectMetrics } from './ProspectsMetricsStrip';
import { type AbResults } from './ProspectsAbPanel';
import ProspectsCampaignPanel, { type CampaignOverviewData } from './ProspectsCampaignPanel';
import ProspectsTable from './ProspectsTable';
import ProspectDrawer from './ProspectDrawer';
import ResearchQueueBanner from './ResearchQueueBanner';
import { useProspectActions } from './useProspectActions';
import {
  deriveStatus,
  VERTICAL_PATHS,
  VERTICAL_UI,
  type LeadState,
  type ProspectRow,
} from './types';

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function ProspectsWorkbench({ vertical }: { vertical: string }): ReactElement {
  const config = VERTICAL_UI[vertical] ?? VERTICAL_UI.str;
  const router = useRouter();
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [leadMap, setLeadMap] = useState<Record<string, LeadState>>({});
  const [metrics, setMetrics] = useState<ProspectMetrics | null>(null);
  const [ab, setAb] = useState<AbResults | null>(null);
  const [campaign, setCampaign] = useState<CampaignOverviewData | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [csvCopied, setCsvCopied] = useState(false);
  // ?prospect=<websiteKey> deep link (campaign-panel drill from another
  // vertical) — handled once, after the list has loaded. Reads
  // window.location directly: useSearchParams would force a Suspense
  // boundary around the whole page (Next 15), overkill for a one-shot read.
  const deepLinkHandled = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    const [listRes, mapRes, metricsRes, abRes, campaignRes] = await Promise.all([
      fetch(`/api/v1/admin/partner-prospects?vertical=${encodeURIComponent(vertical)}`),
      fetch('/api/v1/admin/partner-prospects/sync'),
      fetch('/api/v1/admin/partner-prospects/metrics'),
      fetch('/api/v1/admin/partner-prospects/ab'),
      fetch('/api/v1/admin/partner-prospects/campaign'),
    ]);
    const [list, map, m, a, c] = await Promise.all([
      listRes.json(),
      mapRes.json(),
      metricsRes.json(),
      abRes.json(),
      campaignRes.json(),
    ]);
    if (list.success) setProspects(list.data.prospects);
    if (map.success) setLeadMap(map.data.leads);
    if (m.success) setMetrics(m.data);
    if (a.success) setAb(a.data);
    if (c.success) setCampaign(c.data);
  }, [vertical]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (deepLinkHandled.current || prospects.length === 0) return;
    deepLinkHandled.current = true;
    const key = new URLSearchParams(window.location.search).get('prospect');
    if (!key) return;
    const row = prospects.find((p) => p.websiteKey === key);
    if (row) setOpenId(row.id);
  }, [prospects]);

  const actions = useProspectActions(setNotice, refresh);

  /** Campaign-panel drill: same vertical opens the drawer, others navigate. */
  const handleDrill = useCallback(
    (websiteKey: string, targetVertical: string): void => {
      if (targetVertical === vertical) {
        const row = prospects.find((p) => p.websiteKey === websiteKey);
        if (row) setOpenId(row.id);
        return;
      }
      const path = VERTICAL_PATHS[targetVertical] ?? VERTICAL_PATHS.str;
      router.push(`${path}?prospect=${encodeURIComponent(websiteKey)}`);
    },
    [vertical, prospects, router],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (statusFilter !== 'ALL' && deriveStatus(p, leadMap[p.websiteKey]) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.website.toLowerCase().includes(q) ||
        (p.contactName ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [prospects, leadMap, search, statusFilter]);

  const openProspect = openId ? prospects.find((p) => p.id === openId) ?? null : null;

  const toggleSelect = (website: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(website)) next.delete(website);
      else if (next.size < 10) next.add(website);
      return next;
    });
  };

  const enrollSelected = (): void => {
    const websites = [...selected].slice(0, 10);
    if (websites.length === 0) return;
    if (
      !confirm(
        `Enroll ${websites.length} prospect(s) in the outreach campaign?\n\nEmails only go out once the partner-outreach flag is ON (sends are currently held).`
      )
    )
      return;
    void actions.enroll(websites).then(() => setSelected(new Set()));
  };

  const bulkVerify = (): void => {
    const ids = prospects
      .filter((p) => p.email && p.emailVerifyStatus === 'UNVERIFIED')
      .map((p) => p.id);
    if (ids.length === 0) {
      setNotice('No unverified emails in this vertical.');
      return;
    }
    void actions.verifyBulk(ids);
  };

  const copyCsv = async (): Promise<void> => {
    const header = 'business_name,website,category,commission_percent,contact_name,email,phone';
    const rows = filtered
      .filter((p) => !p.partnerSlug)
      .map((p) =>
        [
          csvEscape(p.name),
          csvEscape(p.website),
          config.csvCategory,
          '10',
          csvEscape(p.contactName ?? ''),
          csvEscape(p.email ?? ''),
          csvEscape(p.phone ?? ''),
        ].join(',')
      );
    await navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCsvCopied(true);
    setTimeout(() => setCsvCopied(false), 2500);
  };

  const withContact = prospects.filter((p) => p.email || p.phone).length;
  const enriched = prospects.filter((p) => p.researchStatus === 'ENRICHED').length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          {config.intro} {prospects.length} companies · {withContact} with contact info ·{' '}
          {enriched} enriched.
        </p>
      </div>

      <ProspectsMetricsStrip metrics={metrics} />
      <ProspectsCampaignPanel data={campaign} ab={ab} onDrill={handleDrill} />
      <ResearchQueueBanner metrics={metrics} />
      <ProspectsFilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        selectedCount={selected.size}
        busy={actions.busy}
        onSync={() => void actions.syncToCrm()}
        onEnroll={enrollSelected}
        onBulkVerify={bulkVerify}
        onCopyCsv={() => void copyCsv()}
        csvCopied={csvCopied}
      />

      {notice && (
        <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
          {notice}
        </div>
      )}

      <ProspectsTable
        prospects={filtered}
        leadMap={leadMap}
        selected={selected}
        onToggleSelect={toggleSelect}
        onOpen={setOpenId}
        config={config}
      />

      {openProspect && (
        <ProspectDrawer
          prospect={openProspect}
          state={leadMap[openProspect.websiteKey]}
          config={config}
          actions={actions}
          onVerified={refresh}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
